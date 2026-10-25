export interface NfRecord {
  id: string; url: string; title: string; status: string | null; priority: string | null;
  due: string | null; done: boolean | null; progress: number | null; amount: number | null;
  relatedIds: string[]; notes: string | null; created: string; lastEdited: string; unsupported: string[];
}
export interface Page<T> { items: T[]; nextCursor: string | null; mapping?: Record<string, string | undefined> }
export interface Collection { key: string; label: string; icon?: string; builtin: boolean; description?: string; configured: boolean }
export interface Meta {
  key: string; label: string; fields: Record<string, string | undefined>;
  options: { status: string[]; priority: string[] };
}
export interface DayCount { date: string; count: number }
export interface Tally { name: string; count: number }
export interface TaskStats {
  total: number; done: number; open: number; overdue: number; completionRate: number | null;
  completedInRange: number; completedByDay: DayCount[]; last7: number; prev7: number;
  currentStreak: number; longestStreak: number; byStatus: Tally[]; byPriority: Tally[]; approximate: boolean;
}
export interface CollectionStats {
  key: string; label: string; icon?: string; builtin: boolean; total: number; doneCount: number;
  completionRate: number | null; avgProgress: number | null; hasAmount: boolean; amountInRange: number;
  entriesInRange: number; entriesByDay: DayCount[]; amountByDay: DayCount[]; byStatus: Tally[]; truncated: boolean;
}
export interface Stats { generatedAt: string; rangeDays: number; tasks: TaskStats | null; collections: CollectionStats[] }

export interface Seg { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean; href?: string }
export interface Block {
  id: string; type: 'heading' | 'text' | 'bullet' | 'number' | 'todo' | 'callout' | 'quote' | 'divider' | 'toggle' | 'columns' | 'column' | 'database' | 'page' | 'link';
  level?: 1 | 2 | 3; text?: Seg[]; checked?: boolean; icon?: string; title?: string; url?: string; collectionKey?: string; children?: Block[];
  /** Live records for a database view the server resolved from the heading above it. */
  items?: NfRecord[]; hasMore?: boolean; heading?: string; preset?: string;
}
export interface Related { id: string; title: string; status: string | null; url: string; collectionKey?: string }
export interface HomeSection { key: string; label: string; icon?: string; builtin: boolean; items: NfRecord[]; hasMore: boolean; error?: string }
export interface HomeData {
  generatedAt: string;
  page: { title: string; url: string | null; blocks: Block[]; used: string[]; skipped: number; truncated: boolean; error: string | null } | null;
  sections: HomeSection[];
  related: Record<string, Related>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }
  if (res.status === 401 && typeof window !== 'undefined' && !['/login', '/download'].includes(window.location.pathname)) {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined); // drop the dead cookie so /login does not bounce back
    window.location.href = '/login';
  }
  if (!res.ok) {
    // Nest answers "Cannot GET /api/xyz" when the deployed backend predates this feature.
    const outdated = res.status === 404 && typeof body?.message === 'string' && body.message.startsWith('Cannot ');
    const message = outdated
      ? 'The backend is running an older version that lacks this feature. Redeploy/restart the backend.'
      : body?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  window.location.href = '/login';
}
