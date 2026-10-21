import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { GoalsController, LearningController, ProjectsController, TasksController } from './entities.controller';

@Module({
  providers: [EntitiesService],
  controllers: [TasksController, ProjectsController, GoalsController, LearningController],
  exports: [EntitiesService],
})
export class EntitiesModule {}
