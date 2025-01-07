import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private workflowExecutionCounter: Counter<string>;
  private workflowDurationHistogram: Histogram<string>;

  constructor(private registry: Registry) {
    this.workflowExecutionCounter = new Counter({
      name: 'workflow_executions_total',
      help: 'Total number of workflow executions',
      registers: [this.registry],
    });

    this.workflowDurationHistogram = new Histogram({
      name: 'workflow_duration_seconds',
      help: 'Histogram of workflow execution durations',
      registers: [this.registry],
    });
  }

  public incrementExecutionCount(): void {
    this.workflowExecutionCounter.inc();
  }

  public observeExecutionDuration(duration: number): void {
    this.workflowDurationHistogram.observe(duration);
  }
}
