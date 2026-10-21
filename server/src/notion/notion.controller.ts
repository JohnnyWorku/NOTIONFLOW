import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotionService } from './notion.service';

@ApiTags('notion')
@ApiBearerAuth()
@Controller('notion')
export class NotionController {
  constructor(private notion: NotionService) {}

  @Get('databases')
  list() {
    return this.notion.listDatabases();
  }

  /** Property schema (names + types) so you can verify mappings without sharing secrets. */
  @Get('databases/:id/schema')
  async schema(@Param('id') id: string) {
    const s = await this.notion.resolve(id);
    return {
      id: s.id,
      title: s.title,
      properties: Object.entries(s.properties).map(([name, p]: [string, any]) => ({ name, type: p.type })),
    };
  }
}
