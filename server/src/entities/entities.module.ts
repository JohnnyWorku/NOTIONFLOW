import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { EntitiesService } from './entities.service';
import { CollectionsController, GenericController, GoalsController, LearningController, ProjectsController, TasksController } from './entities.controller';

@Module({
  providers: [CollectionsService, EntitiesService],
  controllers: [TasksController, ProjectsController, GoalsController, LearningController, CollectionsController, GenericController],
  exports: [EntitiesService, CollectionsService],
})
export class EntitiesModule {}
