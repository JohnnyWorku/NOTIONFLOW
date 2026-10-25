import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectionsService } from '../entities/collections.service';
import { EntitiesService } from '../entities/entities.service';
import { NfRecord } from '../entities/mapping';
import { NotionService } from '../notion/notion.service';
import { SyncService } from '../sync/sync.service';
import { lastNDays } from '../stats/stats.util';
import { Block, HAS_CHILDREN, convertBlock, inferView, isEmptyParagraph, presetFilters } from './home.util';

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
  private cache = new Map<number, { at: number; version: number; data: unknown }>();
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

  /** tz = minutes east of UTC, so "today" and "this week" match the viewer's calendar. */
  async get(tz = 0) {
    const version = this.sync.status().version;
    const hit = this.cache.get(tz);
    if (hit && hit.version === version && Date.now() - hit.at < 60_000) return hit.data;

    const sections = await this.loadSections(); // first: resolves schemas so block matching can use source ids
    const page = await this.loadPage(tz);
    const records = [...sections.flatMap((s) => s.items), ...this.viewItems(page?.blocks ?? [])];
    const ids = [...new Set(records.flatMap((i) => i.relatedIds))].slice(0, 40);
    const related = await this.resolveRelated(ids);

    const data = { generatedAt: new Date().toISOString(), page, sections, related };
    this.cache.set(tz, { at: Date.now(), version, data });
    return data;
  }

  private viewItems(blocks: Block[]): NfRecord[] {
    return blocks.flatMap((b) => [...((b.items as NfRecord[] | undefined) ?? []), ...this.viewItems(b.children ?? [])]);
  }

  /**
   * Notion cannot tell us what a database view on the page shows, so each view takes its meaning from the heading
   * above it ("Today's Tasks" → tasks due today) and is filled with live records from NotionFlow's own tables.
   */
  private async attachViews(blocks: Block[], state: { heading: string }, jobs: Promise<void>[], used: Set<string>, today: string) {
    const cols = this.collections.list().filter((c) => c.databaseId).map((c) => ({ key: c.key, label: c.label }));
    for (const b of blocks) {
      if (b.type === 'heading') state.heading = (b.text ?? []).map((s) => s.text).join('');
      if (b.type === 'database') {
        const guess = inferView(state.heading, cols);
        const key = b.collectionKey ?? guess?.collectionKey;
        if (key) {
          const preset = guess?.preset ?? 'all';
          b.collectionKey = key;
          b.preset = preset;
          b.heading = state.heading;
          used.add(key);
          jobs.push(
            this.entities.list(key, { pageSize: 8, ...presetFilters(preset, today) })
              .then((r) => { b.items = r.items; b.hasMore = !!r.nextCursor; })
              .catch(() => { b.items = []; }),
          );
        } else {
          b.heading = state.heading;
        }
      }
      if (b.children?.length) await this.attachViews(b.children, state, jobs, used, today);
    }
  }

  private async loadSections(): Promise<Section[]> {
    const configured = this.collections.list().filter((c) => c.databaseId);
    return Promise.all(
      configured.map(async (c): Promise<Section> => {
        const base = { key: c.key, label: c.label, icon: c.icon, builtin: c.builtin };
        try {
          const r = await this.entities.list(c.key, { pageSize: 6 });
          return { ...base, items: r.items.slice(0, 5), hasMore: r.items.length > 5 || !!r.nextCursor };
        } catch (e: any) {
          this.log.warn(`Home: could not load "${c.key}"`);
          return { ...base, items: [], hasMore: false, error: e?.response?.message ?? 'Could not load this table.' };
        }
      }),
    );
  }

  private async loadPage(tz: number) {
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
      const used = new Set<string>();
      const jobs: Promise<void>[] = [];
      await this.attachViews(blocks, { heading: '' }, jobs, used, lastNDays(1, tz)[0]);
      await Promise.all(jobs);
      return { title, url: page.url as string, blocks, used: [...used], skipped, truncated: calls >= MAX_BLOCK_CALLS || count >= MAX_BLOCKS, error: null as string | null };
    } catch {
      return { title: 'Home', url: null, blocks: [] as Block[], used: [] as string[], skipped: 0, truncated: false, error: 'Could not read your Notion home page. Is it shared with the integration (page → ··· → Connections)?' };
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
