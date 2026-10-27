import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { FieldMap } from './mapping';
import { slugify } from '../home/home.util';

const norm = (s?: string) => (s ?? '').replace(/-/g, '').toLowerCase();

export interface Collection {
  key: string;
  label: string;
  databaseId?: string;
  builtin: boolean;
  icon?: string;
  description?: string;
  fields?: FieldMap;
  /** true = found automatically on the Notion home page (not listed in the server settings). */
  discovered?: boolean;
}

const BUILTIN: [string, string, string, string][] = [
  ['tasks', 'Tasks', 'NOTION_TASKS_DB', 'check'],
  ['projects', 'Projects', 'NOTION_PROJECTS_DB', 'folder'],
  ['goals', 'Goals', 'NOTION_GOALS_DB', 'target'],
  ['learning', 'Learning', 'NOTION_LEARNING_DB', 'book'],
];
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;
const FIELD_KEYS = ['title', 'status', 'priority', 'due', 'done', 'relation', 'progress', 'notes', 'amount'];

/**
 * Registry of Notion databases NotionFlow exposes. The four built-ins come from NOTION_*_DB;
 * any number of extra tables (spiritual, health, finance…) come from NOTION_COLLECTIONS (JSON) or a JSON file.
 * Invalid config fails at startup with a clear message instead of misbehaving later.
 */
@Injectable()
export class CollectionsService {
  private readonly items: Collection[] = [];
  private discovered: Collection[] = [];
  private discoverer?: () => Promise<void>;
  private lastDiscovery = 0;

  constructor(cfg: ConfigService) {
    for (const [key, label, env, icon] of BUILTIN) {
      this.items.push({ key, label, icon, builtin: true, databaseId: cfg.get<string>(env) || undefined });
    }
    const path = cfg.get<string>('NOTION_COLLECTIONS_PATH');
    const raw = cfg.get<string>('NOTION_COLLECTIONS') || (path ? readFileSync(path, 'utf8') : '');
    if (raw.trim()) this.addExtras(raw);
  }

  private addExtras(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('NOTION_COLLECTIONS is not valid JSON.');
    }
    if (!Array.isArray(parsed)) throw new Error('NOTION_COLLECTIONS must be a JSON array.');
    for (const [i, c] of (parsed as any[]).entries()) {
      const where = `NOTION_COLLECTIONS[${i}]`;
      if (!c || typeof c !== 'object') throw new Error(`${where} must be an object.`);
      if (typeof c.key !== 'string' || !KEY_RE.test(c.key)) throw new Error(`${where}.key must match ${KEY_RE} (lowercase letters, digits, dashes).`);
      if (this.items.some((x) => x.key === c.key)) throw new Error(`${where}.key "${c.key}" is already used.`);
      if (typeof c.label !== 'string' || !c.label.trim()) throw new Error(`${where}.label is required.`);
      if (typeof c.databaseId !== 'string' || !c.databaseId.trim()) throw new Error(`${where}.databaseId is required.`);
      let fields: FieldMap | undefined;
      if (c.fields !== undefined) {
        if (typeof c.fields !== 'object' || c.fields === null) throw new Error(`${where}.fields must be an object.`);
        for (const [k, v] of Object.entries(c.fields)) {
          if (!FIELD_KEYS.includes(k) || typeof v !== 'string') throw new Error(`${where}.fields.${k} is not a valid mapping (allowed: ${FIELD_KEYS.join(', ')}).`);
        }
        fields = c.fields as FieldMap;
      }
      this.items.push({
        key: c.key, label: c.label.trim(), databaseId: c.databaseId.trim(), builtin: false,
        icon: typeof c.icon === 'string' ? c.icon : undefined,
        description: typeof c.description === 'string' ? c.description : undefined,
        fields,
      });
    }
  }

  list(): Collection[] {
    return [...this.items, ...this.discovered];
  }
  get(key: string): Collection | undefined {
    return this.list().find((c) => c.key === key);
  }

  /** The Home service registers how to look for tables on the Notion home page. */
  setDiscoverer(fn: () => Promise<void>) {
    this.discoverer = fn;
  }

  /** Re-scan the Notion home page (at most every 30 s). Used when a client asks for a table we do not know yet. */
  async discover(): Promise<void> {
    if (!this.discoverer || Date.now() - this.lastDiscovery < 30_000) return;
    this.lastDiscovery = Date.now();
    try { await this.discoverer(); } catch { /* best effort */ }
  }

  /** Register (or find) the table behind a data source seen on the home page. Returns its key. */
  addDiscovered(dataSourceId: string, label: string): string {
    const existing = this.list().find((c) => c.databaseId && norm(c.databaseId) === norm(dataSourceId));
    if (existing) return existing.key;
    const base = slugify(label) || `t-${norm(dataSourceId).slice(0, 8)}`;
    let key = base;
    for (let i = 2; this.list().some((c) => c.key === key); i++) key = `${base.slice(0, 26)}-${i}`;
    this.discovered.push({ key, label: label.trim() || 'Table', databaseId: dataSourceId, builtin: false, discovered: true });
    return key;
  }

  /** Safe for clients: never includes database IDs. */
  publicList() {
    return this.list().map((c) => ({
      key: c.key, label: c.label, icon: c.icon, builtin: c.builtin, description: c.description, configured: !!c.databaseId, discovered: !!c.discovered,
    }));
  }
}
