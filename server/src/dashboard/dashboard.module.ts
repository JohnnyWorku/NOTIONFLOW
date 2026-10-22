import { Controller, Get, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { EntitiesModule } from '../entities/entities.module';
import { EntitiesService } from '../entities/entities.service';
import { NotionService } from '../notion/notion.service';
import { SyncService } from '../sync/sync.service';
import { NfRecord } from '../entities/mapping';

const day = (d: Date) => d.toISOString().slice(0, 10);

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
class DashboardController {
  constructor(private e: EntitiesService, private notion: NotionService, private cfg: ConfigService, private sync: SyncService) {}

  /** Aggregates only what the data supports: missing databases yield null sections instead of fake numbers. */
  @Get()
  async get() {
    const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => { try { return await fn(); } catch { return null; } };
    const [tasks, projects, goals, learning] = await Promise.all([
      safe(() => this.e.list('tasks', { pageSize: 100 })),
      safe(() => this.e.list('projects', { pageSize: 50 })),
      safe(() => this.e.list('goals', { pageSize: 50 })),
      safe(() => this.e.list('learning', { pageSize: 50 })),
    ]);
    const today = day(new Date());
    const open = (tasks?.items ?? []).filter((t: NfRecord) => t.done !== true && !/done|complete/i.test(t.status ?? ''));
    const avg = (xs: NfRecord[]) => {
      const n = xs.filter((x) => x.progress !== null);
      return n.length ? Math.round(n.reduce((s, x) => s + (x.progress ?? 0), 0) / n.length) : null;
    };
    const recent = [...(tasks?.items ?? []), ...(projects?.items ?? [])]
      .sort((a, b) => b.lastEdited.localeCompare(a.lastEdited)).slice(0, 8);
    return {
      notion: { configured: this.notion.configured },
      sync: this.sync.status(),
      tasks: tasks && {
        today: open.filter((t: NfRecord) => t.due?.slice(0, 10) === today),
        overdue: open.filter((t: NfRecord) => t.due && t.due.slice(0, 10) < today),
        upcoming: open.filter((t: NfRecord) => t.due && t.due.slice(0, 10) > today).slice(0, 10),
      },
      projects: projects && { active: projects.items.filter((p: NfRecord) => !/done|complete|archiv/i.test(p.status ?? '')) },
      goals: goals && { items: goals.items, averageProgress: avg(goals.items) },
      learning: learning && { items: learning.items, averageProgress: avg(learning.items) },
      recent,
    };
  }
}
@Module({ imports: [EntitiesModule], controllers: [DashboardController] })
export class DashboardModule {}
