import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowStatus } from './enums/workflow-status.enum';
import { StepStatus } from './enums/step-status.enum';
import { WorkflowService } from './workflow.service';
import { StepType, WorkflowStep } from './entities/workflow-definition.entity';
import { StepState, CompletedStep } from './interfaces/step-state.interface';

enum TaskType {
  HTTP = 'http',
  SCRIPT = 'script',
  CONDITION = 'condition',
  DELAY = 'delay',
}

interface TaskResult {
  success: boolean;
  output: any;
  error?: string;
}

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepo: Repository<WorkflowInstance>,
    private workflowService: WorkflowService,
  ) {}

  private validateWorkflowInput(schema: Record<string, any>, input: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in input)) {
          errors.push(`Missing required field: ${requiredField}`);
        }
      }
    }

    // Validate property types
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in input) {
          const value = input[field];
          const type = (fieldSchema as any).type;

          switch (type) {
            case 'string':
              if (typeof value !== 'string') {
                errors.push(`Field ${field} must be a string`);
              }
              break;
            case 'number':
              if (typeof value !== 'number') {
                errors.push(`Field ${field} must be a number`);
              }
              break;
            case 'boolean':
              if (typeof value !== 'boolean') {
                errors.push(`Field ${field} must be a boolean`);
              }
              break;
            case 'array':
              if (!Array.isArray(value)) {
                errors.push(`Field ${field} must be an array`);
              }
              break;
            case 'object':
              if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                errors.push(`Field ${field} must be an object`);
              }
              break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async startWorkflow(
    workflowDefinitionId: string,
    businessId: string,
    input: Record<string, any>,
  ): Promise<WorkflowInstance> {
    const definition = await this.workflowService.findOne(workflowDefinitionId);

    if (!definition) {
      throw new Error(`Workflow definition ${workflowDefinitionId} not found`);
    }

    // Validate input against the workflow's input schema
    const validation = this.validateWorkflowInput(definition.inputSchema, input);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Invalid workflow input',
        errors: validation.errors,
      });
    }

    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }

    const instance = this.workflowInstanceRepo.create({
      workflowDefinitionId,
      workflowDefinition: definition,
      businessId,
      input,
      state: {
        currentSteps: [],
        completedSteps: [],
        variables: { ...input },
      },
      output: {},
      status: WorkflowStatus.PENDING,
    });

    const savedInstance = await this.workflowInstanceRepo.save(instance);
    await this.executeWorkflow(savedInstance.id);
    return savedInstance;
  }

  async executeWorkflow(instanceId: string): Promise<void> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
      relations: ['workflowDefinition'],
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    instance.status = WorkflowStatus.RUNNING;
    instance.startedAt = new Date();
    await this.workflowInstanceRepo.save(instance);

    try {
      const readySteps = this.findReadySteps(instance);
      await this.executeSteps(instance, readySteps);
    } catch (error) {
      this.logger.error(`Error executing workflow ${instanceId}:`, error);
      instance.status = WorkflowStatus.FAILED;
      await this.workflowInstanceRepo.save(instance);
    }
  }

  private findReadySteps(instance: WorkflowInstance): string[] {
    const { steps } = instance.workflowDefinition;
    const { completedSteps, currentSteps } = instance.state;

    const completedStepIds = new Set(completedSteps.map((s) => s.stepId));
    const runningStepIds = new Set(currentSteps.map((s) => s.stepId));

    return steps
      .filter((step) => {
        // Skip if step is already completed or running
        if (completedStepIds.has(step.id) || runningStepIds.has(step.id)) {
          return false;
        }

        // Check if all dependencies are completed
        return step.dependencies.every((depId) => completedStepIds.has(depId));
      })
      .map((step) => step.id);
  }

  private async executeSteps(
    instance: WorkflowInstance,
    stepIds: string[],
  ): Promise<void> {
    const steps = stepIds.map((id) =>
      instance.workflowDefinition.steps.find((s) => s.id === id),
    );

    for (const step of steps) {
      try {
        // Add step to current steps
        const stepState = this.createStepState(step);
        instance.state.currentSteps.push(stepState);
        await this.workflowInstanceRepo.save(instance);

        // For human tasks, we just mark them as pending and continue
        if (step.config?.type === 'human') {
          this.logger.log(`Human task ${step.id} waiting for user action`);
          continue;
        }

        // Execute automated steps
        let result: TaskResult;
        if (step.type === StepType.TASK) {
          switch (step.config?.type) {
            case 'script':
              result = await this.executeScriptTask(step.config, instance.state.variables);
              break;
            case 'http':
              result = await this.executeHttpTask(step.config);
              break;
            default:
              throw new Error(`Unsupported task type: ${step.config?.type}`);
          }
        } else {
          throw new Error(`Unsupported step type: ${step.type}`);
        }

        if (result.success) {
          // Update step status and move to completed
          const currentStep = instance.state.currentSteps.find(s => s.stepId === step.id);
          if (currentStep) {
            currentStep.status = StepStatus.COMPLETED;
            currentStep.output = result.output;
            currentStep.endTime = new Date();

            // Move to completed steps
            instance.state.completedSteps.push({
              ...currentStep,
              endTime: currentStep.endTime || new Date(),
              output: currentStep.output || {},
            });
            instance.state.currentSteps = instance.state.currentSteps.filter(
              s => s.stepId !== step.id
            );
          }
        }

        await this.workflowInstanceRepo.save(instance);

        // Check if workflow is complete
        if (this.isWorkflowComplete(instance)) {
          instance.status = WorkflowStatus.COMPLETED;
          instance.completedAt = new Date();
          instance.output = this.generateWorkflowOutput(instance);
          await this.workflowInstanceRepo.save(instance);
        }
      } catch (error) {
        this.logger.error(`Error executing step ${step.id}:`, error);
        throw error;
      }
    }
  }

  private createStepState(step: WorkflowStep): StepState {
    return {
      stepId: step.id,
      status: StepStatus.PENDING,
      startTime: new Date(),
      attempts: 0,
      name: step.name,
      type: step.type,
      config: step.config,
      dependencies: step.dependencies,
    };
  }

  private async executeHttpTask(config: any): Promise<TaskResult> {
    const { url, method, headers, body } = config;
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return {
        success: response.ok,
        output: data,
      };
    } catch (error) {
      throw new Error(`HTTP task failed: ${error.message}`);
    }
  }

  private async executeScriptTask(
    config: any,
    variables: Record<string, any>,
  ): Promise<TaskResult> {
    const { script } = config;
    try {
      // Create a safe context with variables
      const context = {
        ...variables,
        // Add helper functions if needed
        JSON: JSON,
      };

      const result = new Function(
        'context',
        `
        with (context) {
          ${script}
        }
        `,
      )(context);

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  private isWorkflowComplete(instance: WorkflowInstance): boolean {
    const totalSteps = instance.workflowDefinition.steps.length;
    return instance.state.completedSteps.length === totalSteps;
  }

  private generateWorkflowOutput(
    instance: WorkflowInstance,
  ): Record<string, any> {
    // Find the last step that generates output
    const lastStep =
      instance.state.completedSteps[instance.state.completedSteps.length - 1];
    if (lastStep && lastStep.output) {
      return lastStep.output;
    }
    return {};
  }

  async pauseWorkflow(instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    instance.status = WorkflowStatus.PAUSED;
    return await this.workflowInstanceRepo.save(instance);
  }

  async resumeWorkflow(instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    instance.status = WorkflowStatus.RUNNING;
    await this.workflowInstanceRepo.save(instance);

    // Continue execution
    const readySteps = this.findReadySteps(instance);
    await this.executeSteps(instance, readySteps);

    return instance;
  }

  async cancelWorkflow(instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    instance.status = WorkflowStatus.CANCELLED;
    return await this.workflowInstanceRepo.save(instance);
  }
}
