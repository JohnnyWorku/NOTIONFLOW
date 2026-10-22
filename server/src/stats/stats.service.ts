import { Injectable, Logger } from '@nestjs/common';
import { CollectionsService } from '../entities/collections.service';
import { EntitiesService } from '../entities/entities.service';
import { computeCollectionStats, computeTaskStats } from './stats.util';

@Injectable()
export class StatsService {
  private readonly log = new Logger(StatsService.name);
  private cache = new Map<string, { at: number; data: unknown }>();

  constructor(private entities: EntitiesService, private collections: CollectionsService) {}

  /** Cached 60s so opening the dashboard repeatedly does not hammer Notion's rate limit. */
  async get(days: number, tz: number) {
    const cacheKey = `${days}:${tz}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < 60_000) return hit.data;

    const configured = this.collections.list().filter((c) => c.databaseId);
    const loaded = await Promise.all(
      configured.map(async (c) => {
        try {
          return { c, ...(await this.entities.all(c.key, 300)) };
        } catch (e) {
          this.log.warn(`Stats: could not load "${c.key}"`);
          return { c, items: null as null, truncated: false };
        }
      }),
    );
    const tasks = loaded.find((l) => l.c.key === 'tasks');
    const data = {
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      tasks: tasks?.items ? computeTaskStats(tasks.items, days, tz) : null,
      collections: loaded
        .filter((l) => l.c.key !== 'tasks' && l.items)
        .map((l) => ({ ...computeCollectionStats(l.c, l.items!, days, tz, l.truncated), builtin: l.c.builtin, icon: l.c.icon })),
    };
    this.cache.set(cacheKey, { at: Date.now(), data });
    return data;
  }
}
