import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { StepStatus } from '../enums/step-status.enum';

@Injectable()
export class WorkflowEventsService {
  constructor(private eventEmitter: EventEmitter2) {}

  public emitStateChange(workflowId: string, newState: WorkflowStatus | StepStatus): void {
    this.eventEmitter.emit('workflow.stateChange', { workflowId, newState });
  }
}
