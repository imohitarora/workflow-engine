import { StepStatus } from '../enums/step-status.enum';
import { StepConfig } from '../entities/workflow-definition.entity';

export interface StepState {
  stepId: string;
  status: StepStatus;
  startTime: Date;
  attempts: number;
  name: string;
  type: string;
  config: StepConfig;
  dependencies: string[];
}

export interface CompletedStep extends StepState {
  endTime: Date;
  output: any;
}
