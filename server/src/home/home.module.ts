import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EntitiesModule } from '../entities/entities.module';
import { HomeService } from './home.service';

@ApiTags('home')
@ApiBearerAuth()
@Controller('home')
class HomeController {
  constructor(private home: HomeService) {}
  /** ?tz=minutes east of UTC (e.g. 180 for Addis Ababa) */
  @Get() get(@Query('tz') tz?: string) {
    const n = Number.parseInt(tz ?? '', 10);
    return this.home.get(Number.isFinite(n) ? Math.min(840, Math.max(-840, n)) : 0);
  }
}

@Module({ imports: [EntitiesModule], providers: [HomeService], controllers: [HomeController] })
export class HomeModule {}
