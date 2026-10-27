/** Converts raw Notion blocks into a small, client-friendly model. Pure functions: no network, easy to test. */
export interface Seg { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean; href?: string }
export type BlockType =
  | 'heading' | 'text' | 'bullet' | 'number' | 'todo' | 'callout' | 'quote' | 'divider'
  | 'toggle' | 'columns' | 'column' | 'database' | 'page' | 'link';
export interface Block {
  id: string; type: BlockType; level?: 1 | 2 | 3; text?: Seg[]; checked?: boolean; icon?: string;
  title?: string; url?: string; collectionKey?: string; children?: Block[];
  /** Set on database blocks when the server resolved the view to a table: live records for it. */
  items?: unknown[]; hasMore?: boolean; heading?: string; preset?: Preset;
  /** true = the filter/sorts were read from the real Notion view; false/undefined = guessed from the heading. */
  exact?: boolean; viewName?: string; viewUrl?: string; style?: CardStyle; error?: string;
}
import type { CardStyle } from '../entities/mapping';

export type Matcher = (q: { id?: string; title?: string }) => string | undefined;

export const notionUrl = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`;

export function toSegments(rich: any[] | undefined): Seg[] {
  return (rich ?? [])
    .map((r) => {
      const a = r.annotations ?? {};
      const s: Seg = { text: r.plain_text ?? '' };
      if (a.bold) s.bold = true;
      if (a.italic) s.italic = true;
      if (a.code) s.code = true;
      if (a.strikethrough) s.strike = true;
      if (r.href) s.href = r.href;
      return s;
    })
    .filter((s) => s.text !== '');
}

/** Block types whose nested children are worth fetching. */
export const HAS_CHILDREN = new Set(['column_list', 'column', 'toggle', 'callout', 'quote', 'bulleted_list_item', 'numbered_list_item', 'to_do']);

export const isEmptyParagraph = (b: any) => b.type === 'paragraph' && toSegments(b.paragraph?.rich_text).length === 0;

/** Returns null for block types we do not render (counted as "skipped" by the caller). */
export function convertBlock(b: any, match: Matcher): Block | null {
  const t: string = b.type;
  const v = b[t] ?? {};
  const id: string = b.id;
  switch (t) {
    case 'heading_1': case 'heading_2': case 'heading_3':
      return { id, type: 'heading', level: Number(t.slice(-1)) as 1 | 2 | 3, text: toSegments(v.rich_text) };
    case 'paragraph': {
      const text = toSegments(v.rich_text);
      return text.length ? { id, type: 'text', text } : null;
    }
    case 'bulleted_list_item': return { id, type: 'bullet', text: toSegments(v.rich_text) };
    case 'numbered_list_item': return { id, type: 'number', text: toSegments(v.rich_text) };
    case 'to_do': return { id, type: 'todo', text: toSegments(v.rich_text), checked: !!v.checked };
    case 'callout': return { id, type: 'callout', text: toSegments(v.rich_text), icon: v.icon?.type === 'emoji' ? v.icon.emoji : undefined };
    case 'quote': return { id, type: 'quote', text: toSegments(v.rich_text) };
    case 'divider': return { id, type: 'divider' };
    case 'toggle': return { id, type: 'toggle', text: toSegments(v.rich_text) };
    case 'column_list': return { id, type: 'columns' };
    case 'column': return { id, type: 'column' };
    case 'child_database': {
      const title = typeof v.title === 'string' && v.title.trim() && v.title.trim().toLowerCase() !== 'untitled' ? v.title : undefined;
      return { id, type: 'database', title, url: notionUrl(id), collectionKey: match({ id, title }) };
    }
    case 'child_page':
      return { id, type: 'page', title: v.title, url: notionUrl(id) };
    case 'link_to_page': {
      const target: string | undefined = v.database_id ?? v.page_id;
      if (!target) return null;
      const key = v.database_id ? match({ id: target }) : undefined;
      return { id, type: key ? 'database' : 'page', url: notionUrl(target), collectionKey: key };
    }
    case 'bookmark': {
      if (!v.url) return null;
      return { id, type: 'link', url: v.url, title: toSegments(v.caption).map((s) => s.text).join('') || v.url };
    }
    default:
      return null;
  }
}


// ---------------------------------------------------------------------------------------------
// Heading -> live view. Notion's API cannot describe a database *view* placed on a page (its filter,
// its name), so we read the intent from the heading above it: "Today's Tasks", "Active Projects"...
// ---------------------------------------------------------------------------------------------
export type Preset = 'all' | 'today' | 'week' | 'overdue' | 'open' | 'upcoming';

const strip = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function inferPreset(heading: string): Preset {
  const t = strip(heading);
  if (/\b(overdue|late)\b/.test(t)) return 'overdue';
  if (/\btoday\b/.test(t)) return 'today';
  if (/\bweek\b/.test(t)) return 'week';
  if (/\b(upcoming|next)\b/.test(t)) return 'upcoming';
  if (/\b(active|open|current|ongoing)\b|in progress/.test(t)) return 'open';
  return 'all';
}

const KEYWORDS: [RegExp, string][] = [
  [/\b(tasks?|to ?dos?)\b/, 'tasks'],
  [/\bprojects?\b/, 'projects'],
  [/\bgoals?\b/, 'goals'],
  [/\b(learn(ing)?|study|courses?)\b/, 'learning'],
];

export function inferView(heading: string, cols: { key: string; label: string }[]): { collectionKey: string; preset: Preset } | null {
  const t = strip(heading);
  if (!t) return null;
  const preset = inferPreset(heading);
  // 1) a configured table named in the heading (longest label first, so "Reading list" beats "List")
  const named = [...cols].sort((a, b) => b.label.length - a.label.length).find((c) => {
    const l = strip(c.label);
    return (l && new RegExp(`\\b${esc(l)}\\b`).test(t)) || t === c.key;
  });
  if (named) return { collectionKey: named.key, preset };
  // 2) common words for the built-in tables
  for (const [re, key] of KEYWORDS) if (re.test(t) && cols.some((c) => c.key === key)) return { collectionKey: key, preset };
  // 3) "Today", "This week", "Overdue", "Upcoming" on their own mean tasks
  if (preset !== 'all' && preset !== 'open' && cols.some((c) => c.key === 'tasks')) return { collectionKey: 'tasks', preset };
  return null;
}

export const addDays = (ymd: string, n: number): string => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Translate a preset into list filters. Weeks run Monday to Sunday. */
export function presetFilters(preset: Preset, today: string): { dueFrom?: string; dueTo?: string; open?: boolean; overdue?: boolean } {
  switch (preset) {
    case 'today': return { dueFrom: today, dueTo: today };
    case 'week': {
      const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
      const monday = addDays(today, -dow);
      return { dueFrom: monday, dueTo: addDays(monday, 6) };
    }
    case 'overdue': return { overdue: true };
    case 'upcoming': return { dueFrom: addDays(today, 1), open: true };
    case 'open': return { open: true };
    default: return {};
  }
}


// ---------------------------------------------------------------------------------------------
// Exact Notion views (Views API): reuse the saved filter + sorts of the view placed on the page.
// ---------------------------------------------------------------------------------------------
export const stripEmoji = (s: string): string => s.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').replace(/\s+/g, ' ').trim();

/** URL-safe table key. Empty when the name has no Latin letters/digits (the caller then falls back to the id). */
export function slugify(s: string): string {
  const t = stripEmoji(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '');
  return /^[a-z0-9]/.test(t) ? t : '';
}

/**
 * The view's own filter plus any quick filters that have a value. Quick filters that need "me" (the viewer) are skipped:
 * an integration has no Notion user to substitute. Stays within Notion's two-level nesting limit by merging into a top-level `and`.
 */
export function composeFilter(filter: any | null | undefined, quick: Record<string, any> | null | undefined): any | undefined {
  const extra: any[] = [];
  for (const [property, cond] of Object.entries(quick ?? {})) {
    if (!cond || typeof cond !== 'object' || Object.keys(cond).length === 0) continue;
    if (JSON.stringify(cond).includes('"me"')) continue;
    extra.push({ property, ...cond });
  }
  if (!filter) return extra.length === 0 ? undefined : extra.length === 1 ? extra[0] : { and: extra };
  if (extra.length === 0) return filter;
  if (Array.isArray(filter.and)) return { and: [...filter.and, ...extra] };
  return { and: [filter, ...extra] };
}

/** Runs async tasks with limited concurrency (Notion allows about 3 requests per second). */
export async function runPool(tasks: (() => Promise<unknown>)[], size: number): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, tasks.length) }, async () => {
      while (next < tasks.length) {
        const task = tasks[next++];
        await task().catch(() => undefined);
      }
    }),
  );
}
