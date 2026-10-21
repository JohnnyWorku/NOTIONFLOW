import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { CreateRecordDto, ListQueryDto, UpdateRecordDto } from './dto';
import { Kind } from './mapping';

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
