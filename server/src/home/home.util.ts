/** Converts raw Notion blocks into a small, client-friendly model. Pure functions: no network, easy to test. */
export interface Seg { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean; href?: string }
export type BlockType =
  | 'heading' | 'text' | 'bullet' | 'number' | 'todo' | 'callout' | 'quote' | 'divider'
  | 'toggle' | 'columns' | 'column' | 'database' | 'page' | 'link';
export interface Block {
  id: string; type: BlockType; level?: 1 | 2 | 3; text?: Seg[]; checked?: boolean; icon?: string;
  title?: string; url?: string; collectionKey?: string; children?: Block[];
}
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
    case 'child_database':
      return { id, type: 'database', title: v.title, url: notionUrl(id), collectionKey: match({ id, title: v.title }) };
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
