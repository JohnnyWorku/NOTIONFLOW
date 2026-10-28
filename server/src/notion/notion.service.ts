import { HttpException, HttpStatus, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

export interface ResolvedSource {
  id: string; // id to use for querying (data source id when the data-source model is active)
  dataSourceMode: boolean;
  title: string;
  properties: Record<string, any>;
}

/**
 * Thin, defensive wrapper around the official SDK.
 * NOTE: Notion moved to a "data source" model (API 2025-09-03). This wrapper supports both the
 * data-source model and the legacy database model; the SDK surface must be verified on first
 * real run (see docs/STATUS.md). All SDK calls are isolated here so a change touches one file.
 */
@Injectable()
export class NotionService {
  private readonly log = new Logger(NotionService.name);
  private readonly client: Client | null;
  private readonly cache = new Map<string, ResolvedSource>();

  constructor(cfg: ConfigService) {
    const token = cfg.get<string>('NOTION_TOKEN');
    this.client = token
      ? new Client({ auth: token, notionVersion: cfg.get<string>('NOTION_API_VERSION') || undefined })
      : null;
  }

  get configured() {
    return this.client !== null;
  }

  private c(): any {
    if (!this.client) throw new ServiceUnavailableException({ code: 'NOTION_NOT_CONFIGURED', message: 'NOTION_TOKEN is not set on the server.' });
    return this.client;
  }

  /** Retry on rate limits / transient 5xx with backoff, translate Notion errors to safe HTTP errors. */
  private async call(fn: () => Promise<any>): Promise<any> {
    let attempt = 0;
    for (;;) {
      try {
        return await fn();
      } catch (e: any) {
        const code = e?.code as string | undefined;
        const status = e?.status as number | undefined;
        const transient = code === 'rate_limited' || (status !== undefined && status >= 500) || code === 'ECONNRESET';
        if (transient && attempt < 3) {
          attempt++;
          const wait = 400 * 2 ** attempt;
          this.log.warn(`Notion transient error (${code ?? status}); retry ${attempt} in ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw this.translate(e);
      }
    }
  }

  private translate(e: any): HttpException {
    const code = e?.code as string | undefined;
    if (code === 'object_not_found') return new NotFoundException({ code: 'NOTION_NOT_FOUND', message: 'Not found, or not shared with the integration.' });
    if (code === 'unauthorized') return new HttpException({ code: 'NOTION_UNAUTHORIZED', message: 'Notion rejected the integration token.' }, HttpStatus.BAD_GATEWAY);
    if (code === 'restricted_resource') return new HttpException({ code: 'NOTION_FORBIDDEN', message: 'The integration lacks permission for this resource.' }, HttpStatus.FORBIDDEN);
    if (code === 'validation_error') return new HttpException({ code: 'NOTION_VALIDATION', message: 'Notion rejected the data (check property names/types).' }, HttpStatus.UNPROCESSABLE_ENTITY);
    if (code === 'rate_limited') return new HttpException({ code: 'NOTION_RATE_LIMITED', message: 'Notion rate limit reached; try again shortly.' }, HttpStatus.SERVICE_UNAVAILABLE);
    if (e instanceof HttpException) return e;
    this.log.error(`Unhandled Notion error: ${code ?? e?.message}`);
    return new HttpException({ code: 'NOTION_ERROR', message: 'Unexpected Notion error.' }, HttpStatus.BAD_GATEWAY);
  }

  private titleOf(t?: any[]): string {
    return (t ?? []).map((x) => x.plain_text).join('') || 'Untitled';
  }

  async listDatabases(): Promise<{ id: string; title: string; url?: string }[]> {
    const run = async (value: string) =>
      this.call(() => this.c().search({ filter: { property: 'object', value }, page_size: 100 }));
    let res: any;
    try {
      res = await run('data_source');
    } catch {
      res = await run('database');
    }
    return (res.results ?? []).map((r: any) => ({ id: r.id, title: this.titleOf(r.title), url: r.url }));
  }

  /** Resolve an id (database or data source) to a queryable source + its property schema. */
  async resolve(id: string): Promise<ResolvedSource> {
    const hit = this.cache.get(id);
    if (hit) return hit;
    let out: ResolvedSource;
    try {
      const ds = await this.call(() => this.c().dataSources.retrieve({ data_source_id: id }));
      out = { id, dataSourceMode: true, title: this.titleOf(ds.title), properties: ds.properties };
    } catch {
      const db = await this.call(() => this.c().databases.retrieve({ database_id: id }));
      const dsId = db.data_sources?.[0]?.id as string | undefined;
      if (dsId) {
        const ds = await this.call(() => this.c().dataSources.retrieve({ data_source_id: dsId }));
        out = { id: dsId, dataSourceMode: true, title: this.titleOf(db.title), properties: ds.properties };
      } else {
        out = { id, dataSourceMode: false, title: this.titleOf(db.title), properties: db.properties };
      }
    }
    this.cache.set(id, out);
    return out;
  }

  invalidateSchema(id?: string) {
    if (id) this.cache.delete(id);
    else this.cache.clear();
  }

  async query(src: ResolvedSource, args: { filter?: any; sorts?: any[]; start_cursor?: string; page_size?: number }) {
    const base = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
    return this.call(() =>
      src.dataSourceMode
        ? this.c().dataSources.query({ data_source_id: src.id, ...base })
        : this.c().databases.query({ database_id: src.id, ...base }),
    );
  }

  /** Views of a database block, e.g. a linked database view placed on a page (Notion Views API). */
  listViews(databaseId: string): Promise<any> {
    return this.call(() => this.c().request({ path: 'views', method: 'get', query: { database_id: databaseId } }));
  }

  /** Full view definition: name, type, filter, sorts, quick_filters, data_source_id, url. */
  getView(viewId: string): Promise<any> {
    return this.call(() => this.c().request({ path: `views/${viewId}`, method: 'get' }));
  }

  /** Children of a block/page (used to mirror your Notion home page). */
  listBlocks(blockId: string, cursor?: string): Promise<any> {
    return this.call(() => this.c().blocks.children.list({ block_id: blockId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }));
  }

  getBlock(blockId: string): Promise<any> {
    return this.call(() => this.c().blocks.retrieve({ block_id: blockId }));
  }

  private pageOfCache = new Map<string, string | null>();

  /**
   * The page a database lives on, e.g. the "Spiritual" page that holds the Spiritual tables.
   * Walks up through column/toggle blocks. null when the database sits in the workspace root or inside another database.
   * Accepts a database id or a data source id.
   */
  async parentPageOf(id: string): Promise<string | null> {
    if (this.pageOfCache.has(id)) return this.pageOfCache.get(id) ?? null;
    let parent: any = null;
    try {
      const ds = await this.call(() => this.c().dataSources.retrieve({ data_source_id: id }));
      parent = ds.database_parent ?? null;
      if (!parent && ds.parent?.database_id) {
        parent = (await this.call(() => this.c().databases.retrieve({ database_id: ds.parent.database_id }))).parent;
      }
    } catch {
      parent = (await this.call(() => this.c().databases.retrieve({ database_id: id }))).parent;
    }
    let result: string | null = null;
    for (let hops = 0; parent && hops < 6; hops++) {
      if (parent.type === 'page_id') { result = parent.page_id as string; break; }
      if (parent.type !== 'block_id') break;
      parent = (await this.getBlock(parent.block_id)).parent;
    }
    this.pageOfCache.set(id, result); // only reached when no call failed
    return result;
  }

  /** Resolved queryable id for a configured database id, if its schema was already loaded. */
  cachedSourceId(id: string): string | undefined {
    return this.cache.get(id)?.id;
  }

  getPage(pageId: string): Promise<any> {
    return this.call(() => this.c().pages.retrieve({ page_id: pageId }));
  }

  createPage(src: ResolvedSource, properties: Record<string, any>): Promise<any> {
    const parent = src.dataSourceMode ? { type: 'data_source_id', data_source_id: src.id } : { database_id: src.id };
    return this.call(() => this.c().pages.create({ parent, properties }));
  }

  updatePage(pageId: string, properties: Record<string, any>): Promise<any> {
    return this.call(() => this.c().pages.update({ page_id: pageId, properties }));
  }

  archivePage(pageId: string): Promise<any> {
    return this.call(() => this.c().pages.update({ page_id: pageId, archived: true }));
  }
}
