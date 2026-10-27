import { convertBlock, toSegments, isEmptyParagraph } from './home.util';

const match = (q: { id?: string; title?: string }) => (q.id === 'db-1' || q.title === 'Tasks' ? 'tasks' : undefined);
const rt = (text: string, a: any = {}) => [{ plain_text: text, annotations: a }];

describe('home blocks', () => {
  it('keeps formatting and drops empty segments', () => {
    expect(toSegments([...rt('Hi', { bold: true }), { plain_text: '', annotations: {} }])).toEqual([{ text: 'Hi', bold: true }]);
  });
  it('converts headings, todos and callouts', () => {
    expect(convertBlock({ id: 'a', type: 'heading_2', heading_2: { rich_text: rt('Plan') } }, match)).toMatchObject({ type: 'heading', level: 2 });
    expect(convertBlock({ id: 'b', type: 'to_do', to_do: { rich_text: rt('x'), checked: true } }, match)).toMatchObject({ type: 'todo', checked: true });
    expect(convertBlock({ id: 'c', type: 'callout', callout: { rich_text: rt('n'), icon: { type: 'emoji', emoji: '🔥' } } }, match)).toMatchObject({ icon: '🔥' });
  });
  it('maps inline databases to configured collections', () => {
    expect(convertBlock({ id: 'db-1', type: 'child_database', child_database: { title: 'Whatever' } }, match)).toMatchObject({ type: 'database', collectionKey: 'tasks' });
    expect(convertBlock({ id: 'zz', type: 'child_database', child_database: { title: 'Tasks' } }, match)).toMatchObject({ collectionKey: 'tasks' });
    expect(convertBlock({ id: 'q', type: 'child_database', child_database: { title: 'Other' } }, match)?.collectionKey).toBeUndefined();
  });
  it('skips unsupported and empty blocks', () => {
    expect(convertBlock({ id: 'i', type: 'image', image: {} }, match)).toBeNull();
    const empty = { id: 'p', type: 'paragraph', paragraph: { rich_text: [] } };
    expect(convertBlock(empty, match)).toBeNull();
    expect(isEmptyParagraph(empty)).toBe(true);
  });
  it('links to pages and database', () => {
    expect(convertBlock({ id: 'l', type: 'link_to_page', link_to_page: { type: 'page_id', page_id: 'aaaa-bbbb' } }, match)).toMatchObject({ type: 'page', url: 'https://www.notion.so/aaaabbbb' });
    expect(convertBlock({ id: 'l2', type: 'link_to_page', link_to_page: { type: 'database_id', database_id: 'db-1' } }, match)).toMatchObject({ type: 'database', collectionKey: 'tasks' });
  });
});

import { inferPreset, inferView, presetFilters } from './home.util';

describe('heading → live view', () => {
  const cols = [
    { key: 'tasks', label: 'Tasks' }, { key: 'projects', label: 'Projects' }, { key: 'goals', label: 'Goals' },
    { key: 'learning', label: 'Learning' }, { key: 'spiritual', label: 'Spiritual' },
  ];
  it('reads the filter intent from the heading', () => {
    expect(inferPreset("📌 Today's Tasks")).toBe('today');
    expect(inferPreset('📅 This Week')).toBe('week');
    expect(inferPreset('📈 Active Projects')).toBe('open');
    expect(inferPreset('Learning')).toBe('all');
  });
  it('maps headings to tables', () => {
    expect(inferView("📌 Today's Tasks", cols)).toEqual({ collectionKey: 'tasks', preset: 'today' });
    expect(inferView('📈 Active Projects', cols)).toEqual({ collectionKey: 'projects', preset: 'open' });
    expect(inferView('📚 Learning', cols)).toEqual({ collectionKey: 'learning', preset: 'all' });
    expect(inferView('Spiritual', cols)).toEqual({ collectionKey: 'spiritual', preset: 'all' });
    expect(inferView('📅 This Week', cols)).toEqual({ collectionKey: 'tasks', preset: 'week' });
  });
  it('gives up when nothing matches', () => {
    expect(inferView('Random thoughts', cols)).toBeNull();
    expect(inferView('', cols)).toBeNull();
  });
  it('builds date filters (weeks run Monday to Sunday)', () => {
    expect(presetFilters('today', '2026-10-22')).toEqual({ dueFrom: '2026-10-22', dueTo: '2026-10-22' });
    expect(presetFilters('week', '2026-10-22')).toEqual({ dueFrom: '2026-10-19', dueTo: '2026-10-25' }); // Thursday
    expect(presetFilters('upcoming', '2026-10-22')).toEqual({ dueFrom: '2026-10-23', open: true });
  });
});

import { composeFilter, runPool, slugify, stripEmoji } from './home.util';

describe('exact view helpers', () => {
  it('keeps the view filter untouched when there are no quick filters', () => {
    const f = { property: 'Status', status: { equals: 'Active' } };
    expect(composeFilter(f, null)).toBe(f);
    expect(composeFilter(null, {})).toBeUndefined();
  });
  it('adds quick filters that have a value and skips empty or "me" ones', () => {
    const f = { and: [{ property: 'Done', checkbox: { equals: false } }] };
    expect(composeFilter(f, { Priority: { select: { equals: 'High' } }, Status: {}, Owner: { people: { contains: 'me' } } })).toEqual({
      and: [{ property: 'Done', checkbox: { equals: false } }, { property: 'Priority', select: { equals: 'High' } }],
    });
    expect(composeFilter({ or: [{ property: 'A', checkbox: { equals: true } }] }, { P: { select: { equals: 'x' } } })).toEqual({
      and: [{ or: [{ property: 'A', checkbox: { equals: true } }] }, { property: 'P', select: { equals: 'x' } }],
    });
  });
  it('makes safe keys from names', () => {
    expect(stripEmoji('📌 Today’s Tasks')).toBe('Today’s Tasks');
    expect(slugify('📚 Learning Log')).toBe('learning-log');
    expect(slugify('Prayer & Quran!')).toBe('prayer-quran');
    expect(slugify('ጸሎት')).toBe('');
  });
  it('limits concurrency', async () => {
    let running = 0, peak = 0;
    const task = async () => { running++; peak = Math.max(peak, running); await new Promise((r) => setTimeout(r, 5)); running--; };
    await runPool(Array.from({ length: 8 }, () => task), 3);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
