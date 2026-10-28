import { BadRequestException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EntitiesModule } from '../entities/entities.module';
import { HomeService } from './home.service';

const tzOf = (tz?: string) => {
  const n = Number.parseInt(tz ?? '', 10);
  return Number.isFinite(n) ? Math.min(840, Math.max(-840, n)) : 0;
};

@ApiTags('home')
@ApiBearerAuth()
@Controller('home')
class HomeController {
  constructor(private home: HomeService) {}

  /** ?tz=minutes east of UTC (e.g. 180 for Addis Ababa) */
  @Get() get(@Query('tz') tz?: string) {
    return this.home.get(tzOf(tz));
  }

  /** The Notion page a table lives on (for an "Open page" button), or null. */
  @Get('page-of/:key') pageOf(@Param('key') key: string) {
    return this.home.pageOf(key);
  }
}

@ApiTags('pages')
@ApiBearerAuth()
@Controller('pages')
class PagesController {
  constructor(private home: HomeService) {}

  /** Pinned pages (NOTION_PAGES) and every page linked from your Notion home page. */
  @Get() list(@Query('tz') tz?: string) {
    return this.home.pages(tzOf(tz));
  }

  /** A Notion page mirrored with live lists that use each view's own filter. */
  @Get(':id') get(@Param('id') id: string, @Query('tz') tz?: string) {
    if (!/^[0-9a-f-]{32,36}$/i.test(id)) throw new BadRequestException('Not a Notion page id.');
    return this.home.pageView(id, tzOf(tz));
  }
}

@Module({ imports: [EntitiesModule], providers: [HomeService], controllers: [HomeController, PagesController] })
export class HomeModule {}
