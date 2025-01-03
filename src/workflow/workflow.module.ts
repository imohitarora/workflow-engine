import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowDefinition, WorkflowInstance])],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowExecutionService],
  exports: [WorkflowService, WorkflowExecutionService],
})
export class WorkflowModule {}
