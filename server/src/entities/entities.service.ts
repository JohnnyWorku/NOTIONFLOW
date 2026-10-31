import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { NotionService } from '../notion/notion.service';
import { SyncService } from '../sync/sync.service';
import { CollectionsService } from './collections.service';
import { FieldMap, Kind, MappingError, NfRecord, buildProperties, detectFields, pageToRecord } from './mapping';
import { CreateRecordDto, ListQueryDto, UpdateRecordDto } from './dto';

@Injectable()
export class EntitiesService {
  private fileOverrides: Record<string, FieldMap> = {};
  /** Idempotency-Key -> created record (in memory, 10 min). Prevents duplicate creates on retries. */
  private idem = new Map<string, { at: number; record: NfRecord }>();

  constructor(private notion: NotionService, cfg: ConfigService, private sync: SyncService, private collections: CollectionsService) {
    const path = cfg.get<string>('NOTION_MAPPING_PATH');
    if (path) this.fileOverrides = JSON.parse(readFileSync(path, 'utf8'));
  }

  private dbId(kind: Kind): string {
    const c = this.collections.get(kind);
    if (!c) throw new NotFoundException({ code: 'UNKNOWN_COLLECTION', message: `Unknown collection "${kind}".` });
    if (!c.databaseId) throw new ServiceUnavailableException({ code: 'DB_NOT_CONFIGURED', message: `"${c.label}" has no Notion database configured.` });
    return c.databaseId;
  }

  /** A table that was just added to the Notion home page may not be known yet: look for it once before giving up. */
  private async ensure(kind: Kind) {
    if (!this.collections.get(kind)) await this.collections.discover();
  }

  private async ctx(kind: Kind) {
    const src = await this.notion.resolve(this.dbId(kind));
    const inline = this.collections.get(kind)?.fields;
    return { src, fields: detectFields(src.properties, { ...this.fileOverrides[kind], ...inline }) };
  }

  /** Field mapping + allowed Status/Priority options, so clients can render real dropdowns. */
  async meta(kind: Kind) {
    await this.ensure(kind);
    const { src, fields } = await this.ctx(kind);
    const options = (name?: string): string[] => {
      const p = name ? src.properties[name] : undefined;
      return ((p?.status?.options ?? p?.select?.options ?? []) as any[]).map((o) => o.name as string);
    };
    return {
      key: kind,
      label: this.collections.get(kind)?.label ?? kind,
      title: src.title,
      fields,
      style: this.collections.styleFor(kind, fields),
      options: { status: options(fields.status), priority: options(fields.priority) },
    };
  }

  async list(kind: Kind, q: ListQueryDto) {
    await this.ensure(kind);
    const { src, fields } = await this.ctx(kind);
    const and: any[] = [];
    if (q.search && fields.title) and.push({ property: fields.title, title: { contains: q.search } });
    if (q.status && fields.status) {
      const type = src.properties[fields.status].type;
      and.push({ property: fields.status, [type]: { equals: q.status } });
    }
    if (q.overdue && fields.due) {
      and.push({ property: fields.due, date: { before: new Date().toISOString().slice(0, 10) } });
      if (fields.done) and.push({ property: fields.done, checkbox: { equals: false } });
    }
    if (q.dueFrom && fields.due) and.push({ property: fields.due, date: { on_or_after: q.dueFrom } });
    if (q.dueTo && fields.due) and.push({ property: fields.due, date: { on_or_before: q.dueTo } });
    if (q.open) {
      if (fields.done) {
        and.push({ property: fields.done, checkbox: { equals: false } });
      } else if (fields.status) {
        const prop = src.properties[fields.status];
        const doneNames = ((prop.status?.options ?? prop.select?.options ?? []) as any[])
          .map((o) => o.name as string)
          .filter((n) => /done|complete|finish|archiv/i.test(n));
        for (const name of doneNames) and.push({ property: fields.status, [prop.type]: { does_not_equal: name } });
      }
    }
    const res = await this.notion.query(src, {
      filter: and.length ? { and } : undefined,
      sorts: fields.due ? [{ property: fields.due, direction: fields.done ? 'ascending' : 'descending' }] : [{ timestamp: 'last_edited_time', direction: 'descending' }],
      start_cursor: q.cursor,
      page_size: q.pageSize ?? 25,
    });
    return {
      items: res.results.map((p: any) => pageToRecord(p, fields)) as NfRecord[],
      nextCursor: (res.has_more ? res.next_cursor : null) as string | null,
      mapping: fields,
    };
  }

  /**
   * Records exactly as a saved Notion view selects them: the view's own filter and sorts, passed straight to Notion.
   * `style` tells clients which card design fits this table.
   */
  async listView(kind: Kind, args: { filter?: unknown; sorts?: unknown[] | null; pageSize?: number; cursor?: string }) {
    await this.ensure(kind);
    const { src, fields } = await this.ctx(kind);
    const res = await this.notion.query(src, {
      filter: args.filter ?? undefined,
      sorts: args.sorts && args.sorts.length ? args.sorts : undefined,
      start_cursor: args.cursor,
      page_size: args.pageSize ?? 10,
    });
    return {
      items: res.results.map((p: any) => pageToRecord(p, fields)) as NfRecord[],
      hasMore: !!res.has_more,
      nextCursor: (res.has_more ? res.next_cursor : null) as string | null,
      style: this.collections.styleFor(kind, fields),
    };
  }

  /** Walks pages (up to `max` records) for statistics. */
  async all(kind: Kind, max = 300): Promise<{ items: NfRecord[]; truncated: boolean }> {
    const items: NfRecord[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.list(kind, { pageSize: 100, cursor });
      items.push(...page.items);
      if (!page.nextCursor) return { items, truncated: false };
      if (items.length >= max) return { items: items.slice(0, max), truncated: true };
      cursor = page.nextCursor;
    }
  }

  async get(kind: Kind, pageId: string): Promise<NfRecord> {
    await this.ensure(kind);
    const { fields } = await this.ctx(kind);
    const page = await this.notion.getPage(pageId);
    this.assertBelongs(page, kind);
    return pageToRecord(page, fields);
  }

  /** Reject pages from databases not configured for this collection (prevents arbitrary page edits). */
  private assertBelongs(page: any, kind: Kind) {
    const configured = this.dbId(kind);
    const p = page.parent ?? {};
    const ids = [p.database_id, p.data_source_id].filter(Boolean);
    if (ids.length && !ids.includes(configured) && !this.knownDs(configured, ids)) throw new NotFoundException();
    if (page.archived || page.in_trash) throw new NotFoundException();
  }
  private knownDs(configured: string, ids: string[]) {
    const s = (this.notion as any).cache?.get(configured);
    return !!s && ids.includes(s.id);
  }

  private build(fields: FieldMap, schema: Record<string, any>, input: Parameters<typeof buildProperties>[2]) {
    try {
      return buildProperties(fields, schema, input);
    } catch (e) {
      if (e instanceof MappingError) throw new UnprocessableEntityException({ code: 'MAPPING', message: e.message });
      throw e;
    }
  }

  async create(kind: Kind, dto: CreateRecordDto, idemKey?: string): Promise<NfRecord> {
    this.gc();
    await this.ensure(kind);
    if (idemKey) {
      const hit = this.idem.get(`${kind}:${idemKey}`);
      if (hit) return hit.record;
    }
    const { src, fields } = await this.ctx(kind);
    const { title, status, priority, due, done, notes, progress, amount } = dto;
    const properties = this.build(fields, src.properties, { title, status, priority, due, done, notes, progress, amount });
    const page = await this.notion.createPage(src, properties);
    const record = pageToRecord(page, fields);
    if (idemKey) this.idem.set(`${kind}:${idemKey}`, { at: Date.now(), record });
    this.sync.bump(page.id, 'created');
    return record;
  }

  /**
   * Conflict policy: Notion is the source of truth. If the page was edited in Notion after the version the
   * client saw, refuse with 409 and return the current record so the UI can show a merge/refresh prompt.
   */
  async update(kind: Kind, pageId: string, dto: UpdateRecordDto): Promise<NfRecord> {
    await this.ensure(kind);
    const { src, fields } = await this.ctx(kind);
    const current = await this.notion.getPage(pageId);
    this.assertBelongs(current, kind);
    if (new Date(current.last_edited_time).getTime() !== new Date(dto.expectedLastEdited).getTime()) {
      throw new ConflictException({ code: 'STALE_RECORD', message: 'Record changed in Notion since you loaded it.', current: pageToRecord(current, fields) });
    }
    const { expectedLastEdited, ...input } = dto;
    if (Object.keys(input).length === 0) throw new BadRequestException('Nothing to update.');
    const properties = this.build(fields, src.properties, input);
    const page = await this.notion.updatePage(pageId, properties);
    this.sync.bump(pageId, 'updated');
    return pageToRecord(page, fields);
  }

  /** Archives (moves to Notion's trash); recoverable from Notion. */
  async archive(kind: Kind, pageId: string) {
    await this.ensure(kind);
    const current = await this.notion.getPage(pageId);
    this.assertBelongs(current, kind);
    await this.notion.archivePage(pageId);
    this.sync.bump(pageId, 'deleted');
    return { id: pageId, archived: true };
  }

  private gc() {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [k, v] of this.idem) if (v.at < cutoff) this.idem.delete(k);
  }
}
