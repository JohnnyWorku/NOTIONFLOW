import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EntitiesModule } from '../entities/entities.module';
import { StatsService } from './stats.service';

const clamp = (v: string | undefined, min: number, max: number, dflt: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
class StatsController {
  constructor(private stats: StatsService) {}
  /** ?days=7..365 (default 30)  &tz=minutes east of UTC (e.g. 180 for Addis Ababa) */
  @Get()
  get(@Query('days') days?: string, @Query('tz') tz?: string) {
    return this.stats.get(clamp(days, 7, 365, 30), clamp(tz, -840, 840, 0));
  }
}

@Module({ imports: [EntitiesModule], providers: [StatsService], controllers: [StatsController] })
export class StatsModule {}
