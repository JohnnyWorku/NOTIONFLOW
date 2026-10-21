import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { NotionService } from '../notion/notion.service';
import { SyncService } from '../sync/sync.service';
import { FieldMap, Kind, MappingError, NfRecord, buildProperties, detectFields, pageToRecord } from './mapping';
import { CreateRecordDto, ListQueryDto, UpdateRecordDto } from './dto';

const ENV: Record<Kind, string> = {
  tasks: 'NOTION_TASKS_DB', projects: 'NOTION_PROJECTS_DB', goals: 'NOTION_GOALS_DB', learning: 'NOTION_LEARNING_DB',
};

@Injectable()
export class EntitiesService {
  private overrides: Partial<Record<Kind, FieldMap>> = {};
  /** Idempotency-Key -> created record (in memory, 10 min). Prevents duplicate creates on retries. */
  private idem = new Map<string, { at: number; record: NfRecord }>();

  constructor(private notion: NotionService, private cfg: ConfigService, private sync: SyncService) {
    const path = cfg.get<string>('NOTION_MAPPING_PATH');
    if (path) this.overrides = JSON.parse(readFileSync(path, 'utf8'));
  }

  private dbId(kind: Kind): string {
    const id = this.cfg.get<string>(ENV[kind]);
    if (!id) throw new ServiceUnavailableException({ code: 'DB_NOT_CONFIGURED', message: `${ENV[kind]} is not set.` });
    return id;
  }

  private async ctx(kind: Kind) {
    const src = await this.notion.resolve(this.dbId(kind));
    return { src, fields: detectFields(src.properties, this.overrides[kind]) };
  }

  async list(kind: Kind, q: ListQueryDto) {
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
    const res = await this.notion.query(src, {
      filter: and.length ? { and } : undefined,
      sorts: fields.due ? [{ property: fields.due, direction: 'ascending' }] : [{ timestamp: 'last_edited_time', direction: 'descending' }],
      start_cursor: q.cursor,
      page_size: q.pageSize ?? 25,
    });
    return {
      items: res.results.map((p: any) => pageToRecord(p, fields)),
      nextCursor: res.has_more ? res.next_cursor : null,
      mapping: fields,
    };
  }

  async get(kind: Kind, pageId: string): Promise<NfRecord> {
    const { fields } = await this.ctx(kind);
    const page = await this.notion.getPage(pageId);
    this.assertBelongs(page, kind);
    return pageToRecord(page, fields);
  }

  /** Reject pages from databases not configured for this kind (prevents arbitrary page edits). */
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

  async create(kind: Kind, dto: CreateRecordDto, idemKey?: string): Promise<NfRecord> {
    this.gc();
    if (idemKey) {
      const hit = this.idem.get(`${kind}:${idemKey}`);
      if (hit) return hit.record;
    }
    const { src, fields } = await this.ctx(kind);
    let properties;
    try {
      const { title, status, priority, due, notes, progress } = dto;
      properties = buildProperties(fields, src.properties, { title, status, priority, due, notes, progress });
    } catch (e) {
      if (e instanceof MappingError) throw new UnprocessableEntityException({ code: 'MAPPING', message: e.message });
      throw e;
    }
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
    const { src, fields } = await this.ctx(kind);
    const current = await this.notion.getPage(pageId);
    this.assertBelongs(current, kind);
    if (new Date(current.last_edited_time).getTime() !== new Date(dto.expectedLastEdited).getTime()) {
      throw new ConflictException({ code: 'STALE_RECORD', message: 'Record changed in Notion since you loaded it.', current: pageToRecord(current, fields) });
    }
    const { expectedLastEdited, ...input } = dto;
    if (Object.keys(input).length === 0) throw new BadRequestException('Nothing to update.');
    let properties;
    try {
      properties = buildProperties(fields, src.properties, input);
    } catch (e) {
      if (e instanceof MappingError) throw new UnprocessableEntityException({ code: 'MAPPING', message: e.message });
      throw e;
    }
    const page = await this.notion.updatePage(pageId, properties);
    this.sync.bump(pageId, 'updated');
    return pageToRecord(page, fields);
  }

  async archive(kind: Kind, pageId: string) {
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
