import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { EntitiesService } from './entities.service';
import { CreateRecordDto, ListQueryDto, UpdateRecordDto } from './dto';
import { Kind } from './mapping';

/** Legacy fixed routes (/tasks, /projects, /goals, /learning) kept for backward compatibility. */
function make(kind: Kind) {
  @ApiTags(kind)
  @ApiBearerAuth()
  @Controller(kind)
  class C {
    constructor(readonly svc: EntitiesService) {}
    @Get() list(@Query() q: ListQueryDto) { return this.svc.list(kind, q); }
    @Get(':pageId') get(@Param('pageId') id: string) { return this.svc.get(kind, id); }
    @Post()
    @ApiHeader({ name: 'Idempotency-Key', required: false })
    create(@Body() dto: CreateRecordDto, @Headers('idempotency-key') key?: string) { return this.svc.create(kind, dto, key); }
    @Patch(':pageId') update(@Param('pageId') id: string, @Body() dto: UpdateRecordDto) { return this.svc.update(kind, id, dto); }
    @Delete(':pageId') archive(@Param('pageId') id: string) { return this.svc.archive(kind, id); }
  }
  return C;
}
export const TasksController = make('tasks');
export const ProjectsController = make('projects');
export const GoalsController = make('goals');
export const LearningController = make('learning');

@ApiTags('collections')
@ApiBearerAuth()
@Controller('collections')
export class CollectionsController {
  constructor(private cols: CollectionsService) {}
  @Get() list() { return this.cols.publicList(); }
}

/** Works for every collection, built-in or custom: /api/c/<key>[/<pageId>] */
@ApiTags('collections')
@ApiBearerAuth()
@Controller('c')
export class GenericController {
  constructor(private svc: EntitiesService) {}
  @Get(':key/meta') meta(@Param('key') key: string) { return this.svc.meta(key); }
  @Get(':key') list(@Param('key') key: string, @Query() q: ListQueryDto) { return this.svc.list(key, q); }
  @Get(':key/:pageId') get(@Param('key') key: string, @Param('pageId') id: string) { return this.svc.get(key, id); }
  @Post(':key')
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  create(@Param('key') key: string, @Body() dto: CreateRecordDto, @Headers('idempotency-key') idem?: string) { return this.svc.create(key, dto, idem); }
  @Patch(':key/:pageId') update(@Param('key') key: string, @Param('pageId') id: string, @Body() dto: UpdateRecordDto) { return this.svc.update(key, id, dto); }
  @Delete(':key/:pageId') archive(@Param('key') key: string, @Param('pageId') id: string) { return this.svc.archive(key, id); }
}
