import { WorkflowStatus } from '../enums/workflow-status.enum';

export class WorkflowStateMachine {
  private currentState: WorkflowStatus;

  constructor(initialState: WorkflowStatus) {
    this.currentState = initialState;
  }

  public transitionTo(newState: WorkflowStatus): boolean {
    if (this.canTransitionTo(newState)) {
      this.currentState = newState;
      return true;
    }
    return false;
  }

  private canTransitionTo(newState: WorkflowStatus): boolean {
    const validTransitions = {
      [WorkflowStatus.PENDING]: [WorkflowStatus.RUNNING],
      [WorkflowStatus.RUNNING]: [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED],
      [WorkflowStatus.COMPLETED]: [],
      [WorkflowStatus.FAILED]: [WorkflowStatus.RETRYING],
      [WorkflowStatus.RETRYING]: [WorkflowStatus.RUNNING, WorkflowStatus.FAILED],
    };
    return validTransitions[this.currentState].includes(newState);
  }

  public getCurrentState(): WorkflowStatus {
    return this.currentState;
  }
}
