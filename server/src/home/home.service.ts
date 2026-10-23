import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectionsService } from '../entities/collections.service';
import { EntitiesService } from '../entities/entities.service';
import { NfRecord } from '../entities/mapping';
import { NotionService } from '../notion/notion.service';
import { SyncService } from '../sync/sync.service';
import { Block, HAS_CHILDREN, convertBlock, isEmptyParagraph } from './home.util';

export interface RelatedInfo { id: string; title: string; status: string | null; url: string; collectionKey?: string }
interface Section { key: string; label: string; icon?: string; builtin: boolean; items: NfRecord[]; hasMore: boolean; error?: string }

const norm = (s?: string) => (s ?? '').replace(/-/g, '').toLowerCase();
const MAX_BLOCK_CALLS = 25;
const MAX_BLOCKS = 150;

/**
 * "Home": the live overview that ties every connected table together.
 *  - sections: recent records of each configured table
 *  - related: titles of records linked through Notion relations (across tables)
 *  - page: optional mirror of YOUR Notion home page (NOTION_HOME_PAGE_ID), simplified
 * Cached until the sync version changes (any app write / webhook) or 60 seconds pass.
 */
@Injectable()
export class HomeService {
  private readonly log = new Logger(HomeService.name);
  private cache: { at: number; version: number; data: unknown } | null = null;
  private relatedCache = new Map<string, { at: number; info: RelatedInfo | null }>();

  constructor(
    private entities: EntitiesService, private collections: CollectionsService, private notion: NotionService,
    private sync: SyncService, private cfg: ConfigService,
  ) {}

  private matchCollection = (q: { id?: string; title?: string }): string | undefined => {
    const id = norm(q.id);
    const all = this.collections.list();
    if (id) {
      for (const c of all) {
        if (!c.databaseId) continue;
        if (norm(c.databaseId) === id || norm(this.notion.cachedSourceId(c.databaseId)) === id) return c.key;
      }
    }
    const title = (q.title ?? '').trim().toLowerCase();
    return title ? all.find((c) => c.databaseId && c.label.toLowerCase() === title)?.key : undefined;
  };

  async get() {
    const version = this.sync.status().version;
    if (this.cache && this.cache.version === version && Date.now() - this.cache.at < 60_000) return this.cache.data;

    const sections = await this.loadSections(); // first: resolves schemas so block matching can use source ids
    const page = await this.loadPage();
    const ids = [...new Set(sections.flatMap((s) => s.items.flatMap((i) => i.relatedIds)))].slice(0, 40);
    const related = await this.resolveRelated(ids);

    const data = { generatedAt: new Date().toISOString(), page, sections, related };
    this.cache = { at: Date.now(), version, data };
    return data;
  }

  private async loadSections(): Promise<Section[]> {
    const configured = this.collections.list().filter((c) => c.databaseId);
    return Promise.all(
      configured.map(async (c): Promise<Section> => {
        const base = { key: c.key, label: c.label, icon: c.icon, builtin: c.builtin };
        try {
          const r = await this.entities.list(c.key, { pageSize: 6 });
          return { ...base, items: r.items.slice(0, 5), hasMore: r.items.length > 5 || !!r.nextCursor };
        } catch {
          this.log.warn(`Home: could not load "${c.key}"`);
          return { ...base, items: [], hasMore: false, error: 'Could not load this table.' };
        }
      }),
    );
  }

  private async loadPage() {
    const id = this.cfg.get<string>('NOTION_HOME_PAGE_ID');
    if (!id) return null;
    try {
      const page = await this.notion.getPage(id);
      const titleProp = (Object.values(page.properties ?? {}) as any[]).find((p) => p.type === 'title');
      const title = ((titleProp?.title ?? []) as any[]).map((t) => t.plain_text).join('') || 'Home';
      let calls = 0, count = 0, skipped = 0;

      const fetchChildren = async (blockId: string, depth: number): Promise<Block[]> => {
        const out: Block[] = [];
        let cursor: string | undefined;
        do {
          if (calls >= MAX_BLOCK_CALLS || count >= MAX_BLOCKS) break;
          calls++;
          const res = await this.notion.listBlocks(blockId, cursor);
          for (const raw of res.results as any[]) {
            const blk = convertBlock(raw, this.matchCollection);
            if (!blk) { if (!isEmptyParagraph(raw)) skipped++; continue; }
            count++;
            if (raw.has_children && HAS_CHILDREN.has(raw.type) && depth < 3) blk.children = await fetchChildren(raw.id, depth + 1);
            out.push(blk);
          }
          cursor = res.has_more ? (res.next_cursor as string) : undefined;
        } while (cursor);
        return out;
      };

      const blocks = await fetchChildren(id, 0);
      return { title, url: page.url as string, blocks, skipped, truncated: calls >= MAX_BLOCK_CALLS || count >= MAX_BLOCKS, error: null as string | null };
    } catch {
      return { title: 'Home', url: null, blocks: [] as Block[], skipped: 0, truncated: false, error: 'Could not read your Notion home page. Is it shared with the integration (page → ··· → Connections)?' };
    }
  }

  private async resolveRelated(ids: string[]): Promise<Record<string, RelatedInfo>> {
    const out: Record<string, RelatedInfo> = {};
    await Promise.all(
      ids.map(async (id) => {
        const hit = this.relatedCache.get(id);
        if (hit && Date.now() - hit.at < 5 * 60_000) { if (hit.info) out[id] = hit.info; return; }
        try {
          const p = await this.notion.getPage(id);
          const info = p.archived || p.in_trash ? null : this.toRelated(p);
          this.relatedCache.set(id, { at: Date.now(), info });
          if (info) out[id] = info;
        } catch {
          /* leave unresolved; do not cache failures */
        }
      }),
    );
    return out;
  }

  private toRelated(p: any): RelatedInfo {
    const props = Object.values(p.properties ?? {}) as any[];
    const t = props.find((x) => x.type === 'title');
    const st = props.find((x) => x.type === 'status');
    const parent = p.parent ?? {};
    return {
      id: p.id,
      title: ((t?.title ?? []) as any[]).map((x) => x.plain_text).join('') || 'Untitled',
      status: st?.status?.name ?? null,
      url: p.url,
      collectionKey: this.matchCollection({ id: parent.database_id ?? parent.data_source_id }),
    };
  }
}
