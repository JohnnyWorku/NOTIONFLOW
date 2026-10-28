import { CollectionsService } from '../entities/collections.service';
import { HomeService } from './home.service';

const rt = (t: string) => [{ plain_text: t, annotations: {} }];

/** A fake Notion shaped like a home page: headings, each followed by a database view. */
function setup() {
  const page = [
    { id: 'h1', type: 'heading_2', heading_2: { rich_text: rt("📌 Today's Tasks") } },
    { id: 'blk-1', type: 'child_database', child_database: { title: 'Untitled' } },
    { id: 'h2', type: 'heading_2', heading_2: { rich_text: rt('Spiritual') } },
    { id: 'blk-2', type: 'child_database', child_database: { title: 'Untitled' } },
    { id: 'h3', type: 'heading_2', heading_2: { rich_text: rt('Secret stuff') } },
    { id: 'blk-3', type: 'child_database', child_database: { title: 'Untitled' } },
    { id: 'h4', type: 'heading_2', heading_2: { rich_text: rt('📈 Active Projects') } },
    { id: 'blk-4', type: 'child_database', child_database: { title: 'Untitled' } },
  ];
  const viewOf: Record<string, string> = { 'blk-1': 'v1', 'blk-2': 'v2', 'blk-3': 'v3' };
  const defs: Record<string, any> = {
    v1: {
      name: 'Today', type: 'table', url: 'https://notion.so/v1', data_source_id: 'ds-tasks',
      filter: { and: [{ property: 'Due', date: { equals: '2026-10-22' } }, { property: 'Done', checkbox: { equals: false } }] },
      sorts: [{ property: 'Due', direction: 'ascending' }],
      quick_filters: { Priority: { select: { equals: 'High' } }, Owner: { people: { contains: 'me' } }, Status: {} },
    },
    v2: { name: 'All entries', type: 'table', url: 'https://notion.so/v2', data_source_id: 'ds-spiritual', filter: null, sorts: null, quick_filters: null },
    v3: { name: 'Hidden', type: 'table', url: 'https://notion.so/v3', data_source_id: 'ds-unshared', filter: null, sorts: null, quick_filters: null },
  };
  const sources: Record<string, [string, string]> = {
    'db-tasks': ['ds-tasks', 'Tasks'], 'db-projects': ['ds-projects', 'Projects'], 'db-goals': ['ds-goals', 'Goals'], 'ds-spiritual': ['ds-spiritual', 'Spiritual Log'],
  };
  const calls = { listView: [] as any[], list: [] as any[] };
  const notion: any = {
    cachedSourceId: () => undefined,
    resolve: async (id: string) => {
      if (id === 'ds-unshared') throw { response: { code: 'NOTION_NOT_FOUND', message: 'Not found, or not shared with the integration.' } };
      const hit = sources[id];
      if (!hit) throw new Error(`unexpected resolve ${id}`);
      return { id: hit[0], title: hit[1], properties: {} };
    },
    getPage: async (id: string) =>
      id === 'home-1'
        ? { id, url: 'https://notion.so/home', properties: { title: { type: 'title', title: rt('Home') } } }
        : { id, url: 'u', properties: { Name: { type: 'title', title: rt('Related thing') } }, parent: { database_id: 'db-projects' } },
    listBlocks: async () => ({ results: page, has_more: false }),
    listViews: async (blockId: string) => {
      if (blockId === 'blk-4') throw { response: { code: 'invalid_request_url' } }; // an API without the Views endpoint
      return { results: [{ id: viewOf[blockId] }] };
    },
    getView: async (id: string) => defs[id],
  };
  const rec = (n: number) => ({ id: `r${n}`, title: `T${n}`, relatedIds: n === 1 ? ['rel-1'] : [] });
  const entities: any = {
    listView: async (key: string, args: any) => { calls.listView.push({ key, ...args }); return { items: [rec(1), rec(2)], hasMore: true, nextCursor: 'c', style: 'task' }; },
    list: async (key: string, args: any) => { calls.list.push({ key, ...args }); return { items: [rec(3)], nextCursor: null, mapping: {} }; },
  };
  const env: Record<string, string> = { NOTION_TASKS_DB: 'db-tasks', NOTION_PROJECTS_DB: 'db-projects', NOTION_GOALS_DB: 'db-goals', NOTION_HOME_PAGE_ID: 'home-1' };
  const cfg: any = { get: (k: string) => env[k] };
  const sync: any = { status: () => ({ version: 1 }) };
  const collections = new CollectionsService(cfg);
  const svc = new HomeService(entities, collections, notion, sync, cfg);
  return { svc, collections, calls, defs, notion, entities, cfg, sync };
}

describe('HomeService with a Notion home page', () => {
  it('reuses the exact filter and sorts of each Notion view', async () => {
    const { svc, calls, defs } = setup();
    const data: any = await svc.get(180);
    const [b1] = data.page.blocks.filter((b: any) => b.type === 'database');
    expect(b1).toMatchObject({ exact: true, collectionKey: 'tasks', viewName: 'Today', viewUrl: 'https://notion.so/v1', style: 'task' });
    const call = calls.listView.find((c) => c.key === 'tasks');
    // the quick filter with a value is added; the "me" one and the empty one are skipped
    expect(call.filter).toEqual({ and: [...defs.v1.filter.and, { property: 'Priority', select: { equals: 'High' } }] });
    expect(call.sorts).toEqual(defs.v1.sorts);
  });

  it('registers a table that is on the page but not in the server settings', async () => {
    const { svc, collections } = setup();
    const data: any = await svc.get(0);
    const b2 = data.page.blocks.filter((b: any) => b.type === 'database')[1];
    expect(b2.collectionKey).toBe('spiritual-log');
    expect(collections.get('spiritual-log')).toMatchObject({ discovered: true, databaseId: 'ds-spiritual', label: 'Spiritual Log' });
    expect(JSON.stringify(collections.publicList())).not.toContain('ds-spiritual'); // ids never reach clients
  });

  it('explains when a database is not shared with the integration', async () => {
    const { svc } = setup();
    const data: any = await svc.get(0);
    const b3 = data.page.blocks.filter((b: any) => b.type === 'database')[2];
    expect(b3.error).toMatch(/not shared/i);
    expect(b3.items).toEqual([]);
  });

  it('falls back to the heading when the Views API is unavailable', async () => {
    const { svc, calls } = setup();
    const data: any = await svc.get(0);
    const b4 = data.page.blocks.filter((b: any) => b.type === 'database')[3];
    expect(b4).toMatchObject({ exact: false, collectionKey: 'projects', preset: 'open' });
    expect(calls.list.find((c) => c.key === 'projects').open).toBe(true);
  });

  it('does not repeat tables the page already shows, and resolves relations across tables', async () => {
    const { svc } = setup();
    const data: any = await svc.get(0);
    expect([...data.page.used].sort()).toEqual(['projects', 'spiritual-log', 'tasks']);
    expect(data.sections.map((s: any) => s.key)).toEqual(['goals']);
    expect(data.sections[0].style).toBe('goal');
    expect(data.related['rel-1'].collectionKey).toBe('projects');
  });

  it('finds new tables on demand and caches results', async () => {
    const { svc, calls, cfg, entities, notion, sync } = setup();
    const fresh = new CollectionsService(cfg);
    new HomeService(entities, fresh, notion, sync, cfg);
    expect(fresh.get('spiritual-log')).toBeUndefined();
    await fresh.discover();
    expect(fresh.get('spiritual-log')).toBeDefined();

    await svc.get(0);
    const n = calls.listView.length;
    await svc.get(0);
    expect(calls.listView.length).toBe(n);
  });
});

describe('HomeService pages', () => {
  const PINNED = '11111111111111111111111111111111';
  function pagesSetup() {
    const homeBlocks = [
      { id: 'h2', type: 'heading_2', heading_2: { rich_text: rt('Spiritual') } },
      { id: 'blk-2', type: 'child_database', child_database: { title: 'Untitled' } },
      { id: 'pg-1', type: 'child_page', child_page: { title: 'Prayer notes' } },
      { id: 'lp-1', type: 'link_to_page', link_to_page: { type: 'page_id', page_id: 'pg-2' } },
    ];
    const spiritualBlocks = [
      { id: 'sh1', type: 'heading_2', heading_2: { rich_text: rt('Spiritual log') } },
      { id: 'blk-5', type: 'child_database', child_database: { title: 'Untitled' } },
      { id: 'sp1', type: 'paragraph', paragraph: { rich_text: rt('Daily prayers.') } },
    ];
    const pagesById: Record<string, { title: string; icon?: any }> = {
      'home-1': { title: 'Home' },
      'page-spiritual': { title: 'Spiritual', icon: { type: 'emoji', emoji: '🕌' } },
      'pg-1': { title: 'Prayer notes', icon: { type: 'emoji', emoji: '📿' } },
      'pg-2': { title: 'Quran plan' },
      [PINNED]: { title: 'Reading list', icon: { type: 'emoji', emoji: '📖' } },
    };
    const view = { name: 'All entries', type: 'table', url: 'https://notion.so/v2', data_source_id: 'ds-spiritual', filter: null, sorts: null, quick_filters: null };
    const notion: any = {
      cachedSourceId: () => undefined,
      resolve: async (id: string) => {
        if (id !== 'ds-spiritual' && id !== 'db-tasks') throw new Error(`unexpected resolve ${id}`);
        return { id: id === 'db-tasks' ? 'ds-tasks' : id, title: id === 'db-tasks' ? 'Tasks' : 'Spiritual Log', properties: {} };
      },
      getPage: async (id: string) => {
        const p = pagesById[id];
        return p
          ? { id, url: `https://notion.so/${id}`, icon: p.icon, properties: { title: { type: 'title', title: rt(p.title) } } }
          : { id, url: 'u', properties: {}, parent: {} };
      },
      listBlocks: async (blockId: string) => ({ results: blockId === 'page-spiritual' ? spiritualBlocks : homeBlocks, has_more: false }),
      listViews: async () => ({ results: [{ id: 'v2' }] }),
      getView: async () => view,
      parentPageOf: async (id: string) => (id === 'ds-spiritual' ? 'page-spiritual' : null),
    };
    const entities: any = {
      listView: async () => ({ items: [{ id: 'r1', title: 'T', relatedIds: [] }], hasMore: false, nextCursor: null, style: 'habit' }),
      list: async () => ({ items: [], nextCursor: null, mapping: {} }),
    };
    const env: Record<string, string> = {
      NOTION_TASKS_DB: 'db-tasks', NOTION_HOME_PAGE_ID: 'home-1', NOTION_PAGES: JSON.stringify([{ id: PINNED, label: 'Reading list', icon: 'book' }]),
    };
    const cfg: any = { get: (k: string) => env[k] };
    const sync: any = { status: () => ({ version: 1 }) };
    return { notion, entities, cfg, sync, svc: new HomeService(entities, new CollectionsService(cfg), notion, sync, cfg) };
  }

  it('knows which Notion page a table lives on', async () => {
    const { svc } = pagesSetup();
    const data: any = await svc.get(0);
    const spiritual = data.page.blocks.find((b: any) => b.type === 'database');
    expect(spiritual).toMatchObject({ collectionKey: 'spiritual-log', pageId: 'page-spiritual', pageTitle: 'Spiritual' });
    expect(await svc.pageOf('spiritual-log')).toMatchObject({ id: 'page-spiritual', title: 'Spiritual' });
    expect(await svc.pageOf('tasks')).toBeNull();
  });

  it('lists pinned pages first, then pages linked from the home page, with titles and emoji', async () => {
    const { svc } = pagesSetup();
    const index = await svc.pages(0);
    expect(index.map((p) => p.title)).toEqual(['Reading list', 'Prayer notes', 'Quran plan']);
    expect(index[0]).toMatchObject({ source: 'config', iconName: 'book', icon: '📖' });
  });

  it('mirrors a page with its live table and no link back to itself', async () => {
    const { svc } = pagesSetup();
    const { page } = await svc.pageView('page-spiritual', 0);
    expect(page).toMatchObject({ title: 'Spiritual', icon: '🕌', error: null, used: ['spiritual-log'] });
    const table: any = page.blocks.find((b) => b.type === 'database');
    expect(table).toMatchObject({ exact: true, collectionKey: 'spiritual-log' });
    expect(table.pageId).toBeUndefined();
  });

  it('rejects a bad pinned-page setting with a clear message', () => {
    const { notion, entities, cfg, sync } = pagesSetup();
    const bad = (value: string): any => ({ get: (k: string) => (k === 'NOTION_PAGES' ? value : cfg.get(k)) });
    expect(() => new HomeService(entities, new CollectionsService(cfg), notion, sync, bad('[{"id":"nope"}]'))).toThrow(/NOTION_PAGES\[0\]\.id/);
    expect(() => new HomeService(entities, new CollectionsService(cfg), notion, sync, bad('{'))).toThrow(/valid JSON/);
  });
});
