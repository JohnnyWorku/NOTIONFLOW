/** Maps arbitrary Notion schemas to NotionFlow's normalized record. Unsupported types are reported, never guessed. */
export type Kind = 'tasks' | 'projects' | 'goals' | 'learning';
export interface FieldMap {
  title?: string; status?: string; priority?: string; due?: string;
  done?: string; relation?: string; progress?: string; notes?: string;
}
export interface NfRecord {
  id: string; url: string; title: string; status: string | null; priority: string | null;
  due: string | null; done: boolean | null; progress: number | null; relatedIds: string[];
  notes: string | null; lastEdited: string; unsupported: string[];
}

const HINTS: Record<keyof FieldMap, RegExp> = {
  title: /./, status: /status|state|stage/i, priority: /priority|importance/i,
  due: /due|deadline|date|target/i, done: /done|complete/i,
  relation: /project|task|goal|relation/i, progress: /progress|percent/i, notes: /note|description|summary/i,
};

const SUPPORTED = new Set(['title', 'rich_text', 'status', 'select', 'date', 'checkbox', 'number', 'relation', 'url']);

/** Auto-detect by type + name hint; explicit overrides always win. */
export function detectFields(schema: Record<string, any>, override: FieldMap = {}): FieldMap {
  const entries = Object.entries(schema) as [string, any][];
  const byType = (types: string[], hint?: RegExp) => {
    const m = entries.filter(([, p]) => types.includes(p.type));
    return (hint && m.find(([n]) => hint.test(n))?.[0]) ?? m[0]?.[0];
  };
  const out: FieldMap = {
    title: byType(['title']),
    status: byType(['status']) ?? byType(['select'], HINTS.status),
    priority: entries.find(([n, p]) => p.type === 'select' && HINTS.priority.test(n))?.[0],
    due: byType(['date'], HINTS.due),
    done: byType(['checkbox'], HINTS.done),
    relation: byType(['relation'], HINTS.relation),
    progress: entries.find(([n, p]) => p.type === 'number' && HINTS.progress.test(n))?.[0],
    notes: byType(['rich_text'], HINTS.notes),
  };
  for (const k of Object.keys(override) as (keyof FieldMap)[]) if (override[k]) out[k] = override[k];
  return out;
}

const plain = (arr?: any[]) => (arr ?? []).map((x) => x.plain_text ?? '').join('');

export function pageToRecord(page: any, f: FieldMap): NfRecord {
  const p = page.properties ?? {};
  const get = (n?: string) => (n ? p[n] : undefined);
  const unsupported = Object.entries(p).filter(([, v]: [string, any]) => !SUPPORTED.has(v.type)).map(([k]) => k);
  const sel = (n?: string) => {
    const v = get(n);
    return v?.status?.name ?? v?.select?.name ?? null;
  };
  return {
    id: page.id,
    url: page.url,
    title: plain(get(f.title)?.title) || 'Untitled',
    status: sel(f.status),
    priority: sel(f.priority),
    due: get(f.due)?.date?.start ?? null,
    done: get(f.done)?.checkbox ?? null,
    progress: get(f.progress)?.number ?? null,
    relatedIds: (get(f.relation)?.relation ?? []).map((r: any) => r.id),
    notes: f.notes ? plain(get(f.notes)?.rich_text) || null : null,
    lastEdited: page.last_edited_time,
    unsupported,
  };
}

export interface WriteInput {
  title?: string; status?: string; priority?: string; due?: string | null;
  done?: boolean; progress?: number; notes?: string;
}

/** Build Notion property payload; throws when a requested field has no mapped property. */
export function buildProperties(f: FieldMap, schema: Record<string, any>, input: WriteInput): Record<string, any> {
  const props: Record<string, any> = {};
  const need = (key: keyof FieldMap, label: string) => {
    const name = f[key];
    if (!name || !schema[name]) throw new MappingError(`No "${label}" property mapped for this database.`);
    return { name, type: schema[name].type as string };
  };
  if (input.title !== undefined) {
    const { name } = need('title', 'title');
    props[name] = { title: [{ text: { content: input.title } }] };
  }
  const choice = (key: keyof FieldMap, label: string, value: string) => {
    const { name, type } = need(key, label);
    props[name] = type === 'status' ? { status: { name: value } } : { select: { name: value } };
  };
  if (input.status !== undefined) choice('status', 'status', input.status);
  if (input.priority !== undefined) choice('priority', 'priority', input.priority);
  if (input.due !== undefined) {
    const { name } = need('due', 'due date');
    props[name] = { date: input.due ? { start: input.due } : null };
  }
  if (input.done !== undefined) props[need('done', 'done checkbox').name] = { checkbox: input.done };
  if (input.progress !== undefined) props[need('progress', 'progress').name] = { number: input.progress };
  if (input.notes !== undefined) props[need('notes', 'notes').name] = { rich_text: [{ text: { content: input.notes } }] };
  return props;
}

export class MappingError extends Error {}
