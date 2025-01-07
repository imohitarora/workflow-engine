// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskExecution } from './entities/task-execution.entity';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskExecution]),
    WorkflowModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule { }