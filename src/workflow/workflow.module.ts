import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowService } from './workflow.service';
import { StepExecution } from './entities/step-execution.entity';
import { WorkflowState } from './entities/workflow-state.entity';
import { WorkflowStep } from './entities/workflow-step.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinition,
      WorkflowInstance,
      StepExecution,
      WorkflowState,
      WorkflowStep,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowExecutionService],
  exports: [WorkflowService, WorkflowExecutionService],
})
export class WorkflowModule {}
