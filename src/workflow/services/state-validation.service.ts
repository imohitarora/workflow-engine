import { Injectable } from '@nestjs/common';
import { WorkflowStateMachine } from '../state-machine/workflow-state-machine';
import { WorkflowStatus } from '../enums/workflow-status.enum';

@Injectable()
export class StateValidationService {
  private stateMachine: WorkflowStateMachine;

  constructor(initialState: WorkflowStatus) {
    this.stateMachine = new WorkflowStateMachine(initialState);
  }

  public validateTransition(newState: WorkflowStatus): boolean {
    return this.stateMachine.transitionTo(newState);
  }

  public getCurrentState(): WorkflowStatus {
    return this.stateMachine.getCurrentState();
  }
}
