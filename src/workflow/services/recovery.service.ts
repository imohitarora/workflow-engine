import { Injectable } from '@nestjs/common';
import { StepExecution } from '../entities/step-execution.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { StepStatus } from '../enums/step-status.enum';
import { setTimeout } from 'timers/promises';
import { DataSource } from 'typeorm';
import { WorkflowEventsService } from '../events/workflow-events.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class RecoveryService {
  constructor(
    @InjectRepository(StepExecution)
    private stepExecutionRepo: Repository<StepExecution>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepo: Repository<WorkflowInstance>,
    private dataSource: DataSource,
    private workflowEventsService: WorkflowEventsService,
    private metricsService: MetricsService,
  ) { }

  public async recoverStuckWorkflows(): Promise<void> {
    await this.dataSource.transaction(async (entityManager) => {
      const stuckWorkflows = await entityManager.find(WorkflowInstance, {
        where: { status: WorkflowStatus.RUNNING },
      });

      for (const workflow of stuckWorkflows) {
        // Implement logic to check if a workflow is stuck and recover it
        console.log(`Recovering workflow: ${workflow.id}`);
        this.workflowEventsService.emitStateChange(workflow.id, WorkflowStatus.RECOVERED);
        this.metricsService.incrementExecutionCount();
      }
    });
  }

  public async retryFailedSteps(): Promise<void> {
    await this.dataSource.transaction(async (entityManager) => {
      const failedSteps = await entityManager.find(StepExecution, {
        where: { status: StepStatus.FAILED },
      });

      for (const step of failedSteps) {
        const backoffDelay = this.calculateBackoff(step.attempts);
        console.log(`Retrying step: ${step.id} after ${backoffDelay}ms`);
        await setTimeout(backoffDelay);
        // Retry logic here
        this.workflowEventsService.emitStateChange(step.id, StepStatus.RETRYING);
        this.metricsService.observeExecutionDuration(backoffDelay / 1000);
      }
    });
  }

  private calculateBackoff(attempts: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const backoffFactor = 2;
    return Math.min(baseDelay * Math.pow(backoffFactor, attempts), maxDelay);
  }
}
