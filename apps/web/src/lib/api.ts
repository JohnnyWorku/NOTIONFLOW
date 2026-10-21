export interface NfRecord {
  id: string; url: string; title: string; status: string | null; priority: string | null;
  due: string | null; done: boolean | null; progress: number | null; relatedIds: string[];
  notes: string | null; lastEdited: string; unsupported: string[];
}
export interface Page<T> { items: T[]; nextCursor: string | null }
export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`, body);
  return body as T;
}

export const Kinds = ['tasks', 'projects', 'goals', 'learning'] as const;
export type Kind = (typeof Kinds)[number];
