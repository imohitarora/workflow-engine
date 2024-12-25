import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowExecutionService } from './workflow-execution.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowDefinition, WorkflowInstance]),
  ],
  providers: [WorkflowService, WorkflowExecutionService],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowExecutionService],
})
export class WorkflowModule {}
