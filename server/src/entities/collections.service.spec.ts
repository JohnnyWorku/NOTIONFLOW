import { CollectionsService } from './collections.service';

const cfg = (env: Record<string, string>): any => ({ get: (k: string) => env[k] });

describe('CollectionsService', () => {
  it('lists the four built-ins and flags unconfigured ones', () => {
    const s = new CollectionsService(cfg({ NOTION_TASKS_DB: 'abc' }));
    expect(s.list().map((c) => c.key)).toEqual(['tasks', 'projects', 'goals', 'learning']);
    expect(s.publicList().find((c) => c.key === 'tasks')?.configured).toBe(true);
    expect(s.publicList().find((c) => c.key === 'goals')?.configured).toBe(false);
  });
  it('adds custom collections and never exposes database ids', () => {
    const json = JSON.stringify([{ key: 'spiritual', label: 'Spiritual', databaseId: 'db1', icon: 'moon', fields: { amount: 'Pages' } }]);
    const s = new CollectionsService(cfg({ NOTION_COLLECTIONS: json }));
    expect(s.get('spiritual')?.fields).toEqual({ amount: 'Pages' });
    expect(JSON.stringify(s.publicList())).not.toContain('db1');
  });
  it('rejects bad config with a clear error', () => {
    expect(() => new CollectionsService(cfg({ NOTION_COLLECTIONS: '{' }))).toThrow(/valid JSON/);
    expect(() => new CollectionsService(cfg({ NOTION_COLLECTIONS: '[{"key":"Bad Key","label":"x","databaseId":"d"}]' }))).toThrow(/key/);
    expect(() => new CollectionsService(cfg({ NOTION_COLLECTIONS: '[{"key":"tasks","label":"x","databaseId":"d"}]' }))).toThrow(/already used/);
    expect(() => new CollectionsService(cfg({ NOTION_COLLECTIONS: '[{"key":"a","label":"x","databaseId":"d","fields":{"bogus":"X"}}]' }))).toThrow(/not a valid mapping/);
  });
  it('lets you force a card design for any table', () => {
    const s = new CollectionsService(cfg({ NOTION_COLLECTIONS: '[{"key":"reading","label":"Reading","databaseId":"d","card":"project"}]', NOTION_CARD_STYLES: '{"spiritual":"habit","tasks":"goal"}' }));
    expect(s.styleFor('reading', {})).toBe('project'); // per-table setting beats the name
    expect(s.styleFor('tasks', {})).toBe('goal'); // NOTION_CARD_STYLES beats everything
    expect(s.styleFor('spiritual', {})).toBe('habit'); // works for tables that are not configured yet
    expect(s.styleFor('projects', {})).toBe('project'); // otherwise inferred
  });
  it('rejects unknown card designs', () => {
    expect(() => new CollectionsService(cfg({ NOTION_CARD_STYLES: '{"x":"fancy"}' }))).toThrow(/must be one of/);
    expect(() => new CollectionsService(cfg({ NOTION_CARD_STYLES: '[1]' }))).toThrow(/JSON object/);
    expect(() => new CollectionsService(cfg({ NOTION_COLLECTIONS: '[{"key":"a","label":"A","databaseId":"d","card":"fancy"}]' }))).toThrow(/card must be one of/);
  });
});
