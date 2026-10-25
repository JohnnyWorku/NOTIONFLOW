import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { NotionService } from '../notion/notion.service';

@ApiTags('health')
@Controller('health')
class HealthController {
  constructor(private notion: NotionService) {}
  /** Public, contains no secrets. */
  @Public() @Get()
  health() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
      notionConfigured: this.notion.configured,
      version: '0.3.2',
      commit: (process.env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || null,
    };
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
