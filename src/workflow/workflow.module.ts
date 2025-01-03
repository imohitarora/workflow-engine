import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { ViewsController } from '../views/views.controller';
import { WorkflowExecutionService } from './workflow-execution.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowDefinition, WorkflowInstance])],
  controllers: [WorkflowController, ViewsController],
  providers: [WorkflowService, WorkflowExecutionService],
  exports: [WorkflowService, WorkflowExecutionService],
})
export class WorkflowModule {}
