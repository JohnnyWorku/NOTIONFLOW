import { ConflictException } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { SyncService } from '../sync/sync.service';
import { CollectionsService } from './collections.service';

const schema = { Name: { type: 'title' }, Status: { type: 'status' }, Due: { type: 'date' }, Done: { type: 'checkbox' } };
const page = (edited: string) => ({
  id: 'p1', url: 'u', last_edited_time: edited, parent: { database_id: 'DB' },
  properties: { Name: { type: 'title', title: [{ plain_text: 'A' }] }, Status: { type: 'status', status: { name: 'Todo' } } },
});

function setup() {
  const notion: any = {
    resolve: jest.fn().mockResolvedValue({ id: 'DB', dataSourceMode: false, title: 't', properties: schema }),
    getPage: jest.fn().mockResolvedValue(page('2026-01-01T00:00:00.000Z')),
    createPage: jest.fn().mockResolvedValue(page('2026-01-01T00:00:00.000Z')),
    updatePage: jest.fn().mockResolvedValue(page('2026-01-02T00:00:00.000Z')),
    query: jest.fn().mockResolvedValue({ results: [page('2026-01-01T00:00:00.000Z')], has_more: false, next_cursor: null }),
  };
  const cfg: any = { get: (k: string) => (k === 'NOTION_TASKS_DB' ? 'DB' : undefined) };
  const sync = new SyncService();
  return { svc: new EntitiesService(notion, cfg, sync, new CollectionsService(cfg)), notion, sync };
}

describe('EntitiesService', () => {
  it('lists with pagination info', async () => {
    const { svc } = setup();
    const r = await svc.list('tasks', { pageSize: 10 });
    expect(r.items).toHaveLength(1);
    expect(r.nextCursor).toBeNull();
  });
  it('creates once for a repeated Idempotency-Key', async () => {
    const { svc, notion } = setup();
    await svc.create('tasks', { title: 'A' }, 'k1');
    await svc.create('tasks', { title: 'A' }, 'k1');
    expect(notion.createPage).toHaveBeenCalledTimes(1);
  });
  it('rejects stale updates with 409', async () => {
    const { svc, notion } = setup();
    await expect(svc.update('tasks', 'p1', { expectedLastEdited: '2025-12-31T00:00:00.000Z', title: 'B' })).rejects.toBeInstanceOf(ConflictException);
    expect(notion.updatePage).not.toHaveBeenCalled();
  });
  it('updates when version matches and bumps sync version', async () => {
    const { svc, notion, sync } = setup();
    const r = await svc.update('tasks', 'p1', { expectedLastEdited: '2026-01-01T00:00:00.000Z', title: 'B' });
    expect(notion.updatePage).toHaveBeenCalledWith('p1', { Name: { title: [{ text: { content: 'B' } }] } });
    expect(r.lastEdited).toBe('2026-01-02T00:00:00.000Z');
    expect(sync.status().version).toBe(1);
  });
  it('refuses pages from another database', async () => {
    const { svc, notion } = setup();
    notion.getPage.mockResolvedValue({ ...page('2026-01-01T00:00:00.000Z'), parent: { database_id: 'OTHER' } });
    await expect(svc.update('tasks', 'p1', { expectedLastEdited: '2026-01-01T00:00:00.000Z', title: 'x' })).rejects.toThrow();
  });
});
