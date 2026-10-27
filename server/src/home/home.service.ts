import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectionsService } from '../entities/collections.service';
import { EntitiesService } from '../entities/entities.service';
import { CardStyle, NfRecord, inferStyle } from '../entities/mapping';
import { NotionService } from '../notion/notion.service';
import { SyncService } from '../sync/sync.service';
import { lastNDays } from '../stats/stats.util';
import { Block, HAS_CHILDREN, composeFilter, convertBlock, inferView, isEmptyParagraph, presetFilters, runPool, stripEmoji } from './home.util';

export interface RelatedInfo { id: string; title: string; status: string | null; url: string; collectionKey?: string }
interface Section { key: string; label: string; icon?: string; builtin: boolean; style: CardStyle; items: NfRecord[]; hasMore: boolean; error?: string }
interface ViewDef { viewId: string; name: string; type: string; filter: unknown; sorts: unknown[] | null; quick: Record<string, unknown> | null; dataSourceId: string | null; url: string }
interface Ctx { today: string; idMap: Map<string, string>; used: Set<string> }

const norm = (s?: string) => (s ?? '').replace(/-/g, '').toLowerCase();
const MAX_BLOCK_CALLS = 25;
const MAX_BLOCKS = 150;
const VIEW_TTL = 2 * 60_000;

/**
 * "Home": the live overview that ties every connected table together.
 *  - page: a mirror of YOUR Notion home page (NOTION_HOME_PAGE_ID). Every database view placed on it is read through
 *    Notion's Views API, so each list uses the SAME filter and sorts as in Notion.
 *  - tables found on that page are registered automatically: add a table to the Notion page and it shows up here.
 *  - sections: recent records of the tables the page does not already show
 *  - related: titles of records linked through Notion relations (across tables)
 * Cached until the sync version changes (any app write / webhook) or 60 seconds pass.
 */
@Injectable()
export class HomeService {
  private readonly log = new Logger(HomeService.name);
  private cache = new Map<number, { at: number; version: number; data: unknown }>();
  private pageCache = new Map<number, { at: number; version: number; page: Awaited<ReturnType<HomeService['loadPage']>> }>();
  private pageInflight = new Map<number, Promise<Awaited<ReturnType<HomeService['loadPage']>>>>();
  private viewCache = new Map<string, { at: number; def: ViewDef | null }>();
  private relatedCache = new Map<string, { at: number; info: RelatedInfo | null }>();

  constructor(
    private entities: EntitiesService, private collections: CollectionsService, private notion: NotionService,
    private sync: SyncService, private cfg: ConfigService,
  ) {
    // Lets other parts of the server say "a table I don't know yet may be on the home page: look again".
    this.collections.setDiscoverer(async () => { await this.pageFor(0); });
  }

  /** Match a block to a configured table by its id or title (used for inline databases that ARE the table). */
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

    const page = await this.pageFor(tz);
    const sections = await this.loadSections(new Set(page?.used ?? []));
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

  /** The mirrored page, cached per timezone and shared between concurrent callers. */
  private pageFor(tz: number) {
    const version = this.sync.status().version;
    const hit = this.pageCache.get(tz);
    if (hit && hit.version === version && Date.now() - hit.at < 60_000) return Promise.resolve(hit.page);
    const running = this.pageInflight.get(tz);
    if (running) return running;
    const p = this.loadPage(tz)
      .then((page) => { this.pageCache.set(tz, { at: Date.now(), version, page }); return page; })
      .finally(() => this.pageInflight.delete(tz));
    this.pageInflight.set(tz, p);
    return p;
  }

  // ----------------------------------------------------------------------------------------------
  // Views
  // ----------------------------------------------------------------------------------------------

  /** First (default) view of a database block on the page, with its saved filter, sorts and data source. */
  private async viewDefinition(blockId: string): Promise<ViewDef | null> {
    const hit = this.viewCache.get(blockId);
    if (hit && Date.now() - hit.at < VIEW_TTL) return hit.def;
    const list = await this.notion.listViews(blockId);
    const first = ((list.results ?? []) as any[])[0]?.id as string | undefined;
    let def: ViewDef | null = null;
    if (first) {
      const v = await this.notion.getView(first);
      def = {
        viewId: first, name: v.name ?? '', type: v.type ?? '', filter: v.filter ?? null, sorts: v.sorts ?? null,
        quick: v.quick_filters ?? null, dataSourceId: v.data_source_id ?? null, url: v.url ?? '',
      };
    }
    this.viewCache.set(blockId, { at: Date.now(), def });
    return def;
  }

  /** Which NotionFlow table is this data source? A table nobody configured yet is registered on the spot. */
  private async collectionFor(dataSourceId: string, heading: string, viewName: string, ctx: Ctx): Promise<string> {
    const known = ctx.idMap.get(norm(dataSourceId));
    if (known) return known;
    const src = await this.notion.resolve(dataSourceId); // throws when the database is not shared with the integration
    const own = src.title && src.title.trim().toLowerCase() !== 'untitled' ? src.title : '';
    const key = this.collections.addDiscovered(src.id, own || stripEmoji(heading) || viewName || 'Table');
    ctx.idMap.set(norm(dataSourceId), key);
    ctx.idMap.set(norm(src.id), key);
    return key;
  }

  private async fillView(b: Block, heading: string, ctx: Ctx) {
    b.heading = heading;

    // 1) The real Notion view: same filter, same sorts.
    let def: ViewDef | null = null;
    try {
      def = await this.viewDefinition(b.id);
    } catch (e: any) {
      this.log.warn(`Views API not usable for a block (${e?.response?.code ?? e?.message ?? 'error'}); falling back to the heading`);
    }
    if (def?.dataSourceId) {
      let key: string;
      try {
        key = await this.collectionFor(def.dataSourceId, heading, def.name, ctx);
      } catch (e: any) {
        b.error = e?.response?.message ?? 'Could not open this table. Is its database shared with the integration?';
        b.items = [];
        return;
      }
      ctx.used.add(key);
      b.collectionKey = key;
      b.viewName = def.name || undefined;
      b.viewUrl = def.url || undefined;
      const withQuick = composeFilter(def.filter, def.quick);
      const attempts = [withQuick, ...(JSON.stringify(withQuick) === JSON.stringify(def.filter ?? undefined) ? [] : [def.filter ?? undefined])];
      let failure: any;
      for (const filter of attempts) {
        try {
          const r = await this.entities.listView(key, { filter, sorts: def.sorts, pageSize: 10 });
          b.items = r.items; b.hasMore = r.hasMore; b.style = r.style; b.exact = true;
          return;
        } catch (e) {
          failure = e;
        }
      }
      const code = failure?.response?.code;
      if (code === 'NOTION_NOT_FOUND' || code === 'NOTION_FORBIDDEN') {
        b.error = failure.response.message;
        b.items = [];
        return;
      }
      this.log.warn(`Could not run the Notion view "${def.name}" (${code ?? failure?.message}); falling back to the heading`);
    }

    // 2) Fallback: read the intent from the heading above ("Today's Tasks", "Active Projects"...).
    const cols = this.collections.list().filter((c) => c.databaseId).map((c) => ({ key: c.key, label: c.label }));
    const guess = inferView(heading, cols);
    const key = b.collectionKey ?? guess?.collectionKey;
    if (!key) return;
    const preset = guess?.preset ?? 'all';
    ctx.used.add(key);
    b.collectionKey = key;
    b.preset = preset;
    b.exact = false;
    try {
      const r = await this.entities.list(key, { pageSize: 10, ...presetFilters(preset, ctx.today) });
      b.items = r.items; b.hasMore = !!r.nextCursor;
      b.style = inferStyle(key, this.collections.get(key)?.label ?? key, r.mapping);
    } catch (e: any) {
      b.error = e?.response?.message ?? 'Could not load this table.';
      b.items = [];
    }
  }

  /** Walk the block tree in reading order so every view knows the heading above it. */
  private collectViewTasks(blocks: Block[], state: { heading: string }, tasks: (() => Promise<unknown>)[], ctx: Ctx) {
    for (const b of blocks) {
      if (b.type === 'heading') state.heading = (b.text ?? []).map((s) => s.text).join('');
      if (b.type === 'database') {
        const heading = state.heading;
        tasks.push(() => this.fillView(b, heading, ctx));
      }
      if (b.children?.length) this.collectViewTasks(b.children, state, tasks, ctx);
    }
  }

  /** normalized data-source id -> table key, for every table the server already knows. */
  private async sourceMap(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await Promise.all(
      this.collections.list().filter((c) => c.databaseId).map(async (c) => {
        map.set(norm(c.databaseId), c.key);
        try { map.set(norm((await this.notion.resolve(c.databaseId!)).id), c.key); } catch { /* not reachable: leave it out */ }
      }),
    );
    return map;
  }

  // ----------------------------------------------------------------------------------------------
  // Sections and the mirrored page
  // ----------------------------------------------------------------------------------------------

  private async loadSections(skip: Set<string>): Promise<Section[]> {
    const configured = this.collections.list().filter((c) => c.databaseId && !skip.has(c.key));
    return Promise.all(
      configured.map(async (c): Promise<Section> => {
        const base = { key: c.key, label: c.label, icon: c.icon, builtin: c.builtin };
        try {
          const r = await this.entities.list(c.key, { pageSize: 6 });
          return { ...base, style: inferStyle(c.key, c.label, r.mapping), items: r.items.slice(0, 5), hasMore: r.items.length > 5 || !!r.nextCursor };
        } catch (e: any) {
          this.log.warn(`Home: could not load "${c.key}"`);
          return { ...base, style: 'standard', items: [], hasMore: false, error: e?.response?.message ?? 'Could not load this table.' };
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
      const ctx: Ctx = { today: lastNDays(1, tz)[0], idMap: await this.sourceMap(), used: new Set<string>() };
      const tasks: (() => Promise<unknown>)[] = [];
      this.collectViewTasks(blocks, { heading: '' }, tasks, ctx);
      await runPool(tasks, 3); // Notion allows about 3 requests per second
      return { title, url: page.url as string, blocks, used: [...ctx.used], skipped, truncated: calls >= MAX_BLOCK_CALLS || count >= MAX_BLOCKS, error: null as string | null };
    } catch {
      return { title: 'Home', url: null, blocks: [] as Block[], used: [] as string[], skipped: 0, truncated: false, error: 'Could not read your Notion home page. Is it shared with the integration (page → ··· → Connections)?' };
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Relations
  // ----------------------------------------------------------------------------------------------

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
