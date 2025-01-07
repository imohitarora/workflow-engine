// NestJS imports
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// Workflow related imports
import { WorkflowStatus } from '../workflow/enums/workflow-status.enum';
import { StepStatus } from '../workflow/enums/step-status.enum';
import { StepType } from '../workflow/enums/step-type.enum';
import { WorkflowService } from '../workflow/workflow.service';

// DTOs
import { TaskDto } from './dto/task.dto';
import { CreateWorkflowDefinitionDto } from '../workflow/dto/create-workflow-definition.dto';

@Injectable()
export class TasksService {
  constructor(private readonly workflowService: WorkflowService) { }

  async findPendingTasks(): Promise<TaskDto[]> {
    const instances = await this.workflowService.findInstancesByStatus(
      WorkflowStatus.RUNNING,
    );

    const pendingTasks: TaskDto[] = [];
    for (const instance of instances) {
      const currentSteps = instance.state.currentSteps || [];
      for (const step of currentSteps) {
        if (step.type === StepType.TASK && step.config?.type === 'human') {
          pendingTasks.push({
            id: `${instance.id}-${step.stepId}`,
            name: step.name,
            workflowInstanceId: instance.id,
            stepId: step.stepId,
            status: StepStatus.PENDING,
            type: step.config?.type,
            form: step.config?.form,
          });
        }
      }
    }
    return pendingTasks;
  }

  async approveTask(taskId: string): Promise<void> {
    const [instanceId, stepId] = taskId.split('-');
    await this.workflowService.approveInstanceStep(instanceId, stepId);
  }

  async rejectTask(taskId: string, formData: Record<string, any>): Promise<void> {
    // Extract workflow instance ID and step ID from task ID
    const [workflowInstanceId, stepId] = taskId.split(/-(?=[^-]+$)/);

    if (!workflowInstanceId || !stepId) {
      throw new BadRequestException('Invalid task ID format');
    }

    // Get the workflow instance
    const instance = await this.workflowService.getInstance(workflowInstanceId);
    if (!instance) {
      throw new NotFoundException(
        `Workflow instance ${workflowInstanceId} not found`,
      );
    }

    // Reject the step
    await this.workflowService.rejectInstanceStep(
      workflowInstanceId,
      stepId,
      formData,
    );
  }

  async getTaskDetails(taskId: string): Promise<any> {
    const [instanceId, stepId] = taskId.split('-');
    const instance = await this.workflowService.getInstance(instanceId);
    if (!instance) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const step = instance.state.currentSteps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new NotFoundException(
        `Step ${stepId} not found in workflow ${instanceId}`,
      );
    }

    const workflowStep = instance.workflowDefinition.steps.find(
      (s) => s.id === stepId,
    );
    if (!workflowStep) {
      throw new NotFoundException(
        `Step ${stepId} not found in workflow definition`,
      );
    }

    return {
      id: taskId,
      businessId: instance.businessId,
      workflowInstanceId: instanceId,
      stepId,
      type: step.type,
      name: step.name,
      status: step.status,
      config: workflowStep.config,
      inputData: this.resolveInputData(instance, workflowStep),
    };
  }

  private resolveInputData(instance: any, step: any): Record<string, any> {
    const inputData: Record<string, any> = {};
    const variables = {
      input: instance.input,
      steps: instance.state.completedSteps.reduce(
        (acc: Record<string, any>, s) => {
          acc[s.stepId] = { output: s.output };
          return acc;
        },
        {},
      ),
    };

    for (const [key, path] of Object.entries(step.config.inputMapping)) {
      inputData[key] = this.resolveJsonPath(variables, path as string);
    }

    return inputData;
  }

  private resolveJsonPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (part.startsWith('$')) continue;
      if (!current) return undefined;
      current = current[part];
    }

    return current;
  }

  async completeTask(
    taskId: string,
    formData: Record<string, any>,
  ): Promise<void> {
    // Extract workflow instance ID and step ID from task ID
    const [workflowInstanceId, stepId] = taskId.split(/-(?=[^-]+$)/);

    if (!workflowInstanceId || !stepId) {
      throw new BadRequestException('Invalid task ID format');
    }

    // Get the workflow instance
    const instance = await this.workflowService.getInstance(workflowInstanceId);
    if (!instance) {
      throw new NotFoundException(
        `Workflow instance ${workflowInstanceId} not found`,
      );
    }

    console.log('formData', formData, workflowInstanceId, stepId);

    // Complete the step
    await this.workflowService.completeInstanceStep(
      workflowInstanceId,
      stepId,
      formData,
    );
  }

  async validateWorkflowDefinition(
    createDto: CreateWorkflowDefinitionDto,
  ): Promise<boolean> {
    // Basic validation
    if (
      !createDto.steps ||
      !Array.isArray(createDto.steps) ||
      createDto.steps.length === 0
    ) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate each step
    for (const step of createDto.steps) {
      if (!step.id || !step.name || !step.type) {
        throw new Error(
          `Step ${step.name || 'unknown'} is missing required fields`,
        );
      }

      if (!step.config) {
        throw new Error(`Step ${step.name} is missing configuration`);
      }

      // Validate step type
      if (!step.config.type) {
        throw new Error(`Step ${step.name} is missing task type configuration`);
      }

      // Validate dependencies exist
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const dependencyExists = createDto.steps.some((s) => s.id === depId);
          if (!dependencyExists) {
            throw new Error(
              `Step ${step.name} has invalid dependency: ${depId}`,
            );
          }
        }
      }
    }

    return true;
  }

  async getAllTasks(): Promise<TaskDto[]> {
    const instances = await this.workflowService.findInstances();
    const tasks: TaskDto[] = [];
    for (const instance of instances) {
      const humanSteps = instance.state.currentSteps.filter(
        (step) => step.config?.type === 'human',
      );
      tasks.push(
        ...humanSteps.map((step) => ({
          id: `${instance.id}-${step.stepId}`,
          name: step.name,
          status: step.status,
          type: step.config?.type,
          workflowInstanceId: instance.id,
          stepId: step.stepId,
          form: step.config?.form,
        })),
      );
    }
    return tasks;
  }

  async getTask(taskId: string): Promise<TaskDto | null> {
    const [instanceId, stepId] = taskId.split('-');

    if (!instanceId || !stepId) {
      throw new BadRequestException('Invalid task ID format');
    }

    const instance = await this.workflowService.getInstance(instanceId);
    if (!instance) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const step = instance.state.currentSteps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new NotFoundException(
        `Step ${stepId} not found in workflow ${instanceId}`,
      );
    }

    return {
      id: taskId,
      name: step.name,
      workflowInstanceId: instanceId,
      stepId: step.stepId,
      status: step.status,
      type: step.config?.type,
      form: step.config?.form,
    };
  }
}
