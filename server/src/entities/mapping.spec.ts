import { buildProperties, detectFields, pageToRecord, MappingError } from './mapping';

const schema = {
  Name: { type: 'title' }, Status: { type: 'status' }, Priority: { type: 'select' },
  Due: { type: 'date' }, Done: { type: 'checkbox' }, Notes: { type: 'rich_text' },
  Project: { type: 'relation' }, Files: { type: 'files' },
};

describe('mapping', () => {
  it('detects fields from schema', () => {
    expect(detectFields(schema)).toMatchObject({ title: 'Name', status: 'Status', priority: 'Priority', due: 'Due', done: 'Done', relation: 'Project', notes: 'Notes' });
  });
  it('honours overrides', () => {
    expect(detectFields(schema, { due: 'Notes' }).due).toBe('Notes');
  });
  it('normalizes a page and reports unsupported types', () => {
    const page = {
      id: 'p1', url: 'u', last_edited_time: '2026-01-01T00:00:00.000Z',
      properties: {
        Name: { type: 'title', title: [{ plain_text: 'Hello' }] },
        Status: { type: 'status', status: { name: 'In progress' } },
        Due: { type: 'date', date: { start: '2026-02-01' } },
        Done: { type: 'checkbox', checkbox: false },
        Project: { type: 'relation', relation: [{ id: 'r1' }] },
        Files: { type: 'files', files: [] },
      },
    };
    const r = pageToRecord(page, detectFields(schema));
    expect(r).toMatchObject({ id: 'p1', title: 'Hello', status: 'In progress', due: '2026-02-01', done: false, relatedIds: ['r1'] });
    expect(r.unsupported).toEqual(['Files']);
  });
  it('builds properties by property type', () => {
    const f = detectFields(schema);
    expect(buildProperties(f, schema, { title: 'T', status: 'Done', priority: 'High', due: '2026-03-01', done: true })).toEqual({
      Name: { title: [{ text: { content: 'T' } }] },
      Status: { status: { name: 'Done' } },
      Priority: { select: { name: 'High' } },
      Due: { date: { start: '2026-03-01' } },
      Done: { checkbox: true },
    });
  });
  it('throws when a field is not mapped', () => {
    expect(() => buildProperties({ title: 'Name' }, schema, { priority: 'High' })).toThrow(MappingError);
  });
});

describe('mapping: amount and created', () => {
  const sch = { Name: { type: 'title' }, Pages: { type: 'number' }, Progress: { type: 'number' }, Date: { type: 'date' } };
  it('detects amount separately from progress', () => {
    const f = detectFields(sch);
    expect(f.progress).toBe('Progress');
    expect(f.amount).toBe('Pages');
  });
  it('reads and writes amount', () => {
    const f = detectFields(sch);
    const page = { id: 'p', url: 'u', created_time: 'c', last_edited_time: 'e', properties: { Name: { type: 'title', title: [] }, Pages: { type: 'number', number: 12 } } };
    expect(pageToRecord(page, f)).toMatchObject({ amount: 12, created: 'c' });
    expect(buildProperties(f, sch, { amount: 7 })).toEqual({ Pages: { number: 7 } });
  });
});

import { inferStyle } from './mapping';

describe('card style', () => {
  it('uses the table name first', () => {
    expect(inferStyle('tasks', 'Tasks', {})).toBe('task');
    expect(inferStyle('projects', 'Projects', {})).toBe('project');
    expect(inferStyle('goals', 'Goals', {})).toBe('goal');
    expect(inferStyle('learning', 'Learning', {})).toBe('learning');
    expect(inferStyle('spiritual', 'Spiritual', {})).toBe('habit');
  });
  it('falls back to the shape of the properties', () => {
    expect(inferStyle('x', 'Chores list', { done: 'Done', due: 'Due' })).toBe('task');
    expect(inferStyle('x', 'Stuff', { progress: 'P', status: 'S' })).toBe('project');
    expect(inferStyle('x', 'Stuff', { progress: 'P' })).toBe('goal');
    expect(inferStyle('x', 'Stuff', { amount: 'Pages' })).toBe('habit');
    expect(inferStyle('x', 'Stuff', {})).toBe('standard');
  });
});
