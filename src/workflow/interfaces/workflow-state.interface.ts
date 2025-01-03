import { StepStatus } from '../enums/step-status.enum';

export interface WorkflowStateStep {
  stepId: string;
  name: string;
  type: string;
  config: Record<string, any>;
  status: StepStatus;
  startTime: Date;
  endTime?: Date;
  error?: string;
  output?: Record<string, any>;
}

export interface WorkflowState {
  currentSteps: WorkflowStateStep[];
  completedSteps: WorkflowStateStep[];
  variables: Record<string, any>;
}
