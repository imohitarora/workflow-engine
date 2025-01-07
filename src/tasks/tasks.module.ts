// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [WorkflowModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
