import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { StepStatus } from './enums/step-status.enum';
import { WorkflowStatus } from './enums/workflow-status.enum';
import { WorkflowService } from './workflow.service';
import { StepType } from './enums/step-type.enum';
import { WorkflowStep } from './entities/workflow-step.entity';
import { StepExecution } from './entities/step-execution.entity';
import { get } from 'lodash';
import { WorkflowState } from './entities/workflow-state.entity';

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
    @InjectRepository(WorkflowStep)
    private workflowStepRepo: Repository<WorkflowStep>,
    @InjectRepository(WorkflowState)
    private workflowStateRepo: Repository<WorkflowState>,
    private workflowService: WorkflowService,
  ) { }

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

    // Load the workflow steps
    const steps = await this.workflowStepRepo.find({
      where: { workflowDefinitionId },
      order: { key: 'ASC' },
    });

    if (!steps.length) {
      throw new Error(`No steps found for workflow ${workflowDefinitionId}`);
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
        stepExecutions: [], // Will be populated during execution
        variables: { ...input },
      },
      output: {},
      status: WorkflowStatus.RUNNING,
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

    // Initialize state if it doesn't exist
    if (!instance.state) {
      const state = this.workflowStateRepo.create({
        stepExecutions: [],
        variables: { ...instance.input }
      });

      const savedState = await this.workflowStateRepo.save(state);
      instance.state = savedState;
      await this.workflowInstanceRepo.save(instance);
    }

    const steps = await this.workflowStepRepo.find({
      where: { workflowDefinitionId: instance.workflowDefinitionId },
      order: { key: 'ASC' },
    });

    instance.status = WorkflowStatus.RUNNING;
    instance.startedAt = new Date();
    await this.workflowInstanceRepo.save(instance);

    try {
      await this.continueWorkflowExecution(instance, steps);
    } catch (error) {
      this.logger.error(`Error executing workflow ${instanceId}:`, error);
      instance.status = WorkflowStatus.FAILED;
      await this.workflowInstanceRepo.save(instance);
    }
  }

  private async continueWorkflowExecution(instance: WorkflowInstance, steps: WorkflowStep[]): Promise<void> {
    const readySteps = this.findReadySteps(instance, steps);
    if (readySteps.length > 0) {
      await this.executeSteps(instance, readySteps, steps);
      // Recursively continue execution for any new ready steps
      await this.continueWorkflowExecution(instance, steps);
    }
  }

  // Update the helper methods as well
  private findReadySteps(instance: WorkflowInstance, steps: WorkflowStep[]): string[] {
    const { stepExecutions } = instance.state;
    const completedStepKeys = new Set(stepExecutions.map((s) => s.stepId));

    return steps
      .filter((step) => {
        // Skip if step is already completed
        if (completedStepKeys.has(step.key)) {
          return false;
        }

        // Check if all dependencies are completed
        return step.dependencies.every((depKey) => completedStepKeys.has(depKey));
      })
      .map((step) => step.key);
  }

  private async executeSteps(
    instance: WorkflowInstance,
    stepKeys: string[],
    allSteps: WorkflowStep[],
  ): Promise<void> {
    const steps = stepKeys
      .map((key) => allSteps.find((s) => s.key === key))
      .filter(Boolean);

    for (const step of steps) {
      try {
        // Create step execution record
        const stepExecution = {
          stepId: step.key,
          step: step,
          status: StepStatus.RUNNING,
          startTime: new Date(),
          attempts: 1,
          output: {},
        } as StepExecution;

        // Ensure state.stepExecutions exists
        if (!instance.state.stepExecutions) {
          instance.state.stepExecutions = [];
        }

        // Add step to current executions
        instance.state.stepExecutions.push(stepExecution);
        await this.workflowInstanceRepo.save(instance);

        // For human tasks, we just mark them as pending and continue
        if (step.config?.type === 'human') {
          this.logger.log(`Human task ${step.key} waiting for user action`);
          stepExecution.status = StepStatus.PENDING;
          await this.workflowInstanceRepo.save(instance);
          continue;
        }

        // Execute automated steps
        let result: TaskResult;
        if (step.type === StepType.TASK) {
          switch (step.config?.type) {
            case 'script':
              result = await this.executeScriptTask(
                step.config,
                instance.state.variables
              );
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
          // Update step execution status
          stepExecution.status = StepStatus.COMPLETED;
          stepExecution.output = result.output;
          stepExecution.endTime = new Date();

          // Update variables with step output using output mapping
          if (step.config?.outputMapping) {
            for (const [key, path] of Object.entries(step.config.outputMapping)) {
              instance.state.variables[key] = result.output[path];
            }
          }
        } else {
          stepExecution.status = StepStatus.FAILED;
          stepExecution.error = result.error;
          stepExecution.endTime = new Date();
          throw new Error(`Step ${step.key} failed: ${result.error}`);
        }

        await this.workflowInstanceRepo.save(instance);

        // Check if workflow is complete
        if (this.isWorkflowComplete(instance, allSteps)) {
          instance.status = WorkflowStatus.COMPLETED;
          instance.completedAt = new Date();
          instance.output = this.generateWorkflowOutput(instance);
          await this.workflowInstanceRepo.save(instance);
        }
      } catch (error) {
        this.logger.error(`Error executing step ${step.key}:`, error);
        throw error;
      }
    }
  }

  // Update isWorkflowComplete method as well
  private isWorkflowComplete(instance: WorkflowInstance, steps: WorkflowStep[]): boolean {
    const completedSteps = new Set(
      instance.state.stepExecutions
        .filter((s) => s.status === StepStatus.COMPLETED)
        .map((s) => s.stepId)
    );

    // All steps should be either completed or in a final state
    return steps.every((step) => {
      const execution = instance.state.stepExecutions.find((s) => s.stepId === step.key);
      return execution && [StepStatus.COMPLETED, StepStatus.FAILED, StepStatus.CANCELLED].includes(execution.status);
    });
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

  // In src/workflow/workflow-execution.service.ts

  private async executeScriptTask(
    config: any,
    variables: Record<string, any>,
  ): Promise<TaskResult> {
    const { script, inputMapping } = config;
    try {
      // Map input variables according to inputMapping
      const input: Record<string, any> = {};
      for (const [key, path] of Object.entries(inputMapping)) {
        if (typeof path === 'string') {
          // Remove the '$.' prefix if present
          const cleanPath = path.replace(/^\$\./, '');
          input[key] = get(variables, cleanPath);
        }
      }

      // Create a safe context with mapped input
      const context = {
        input,
        JSON: JSON,
      };

      const scriptResult = new Function(
        'context',
        `
        with (context) {
          ${script}
        }
        `,
      )(context);

      return {
        success: true,
        output: {
          result: scriptResult
        },
      };
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  private generateWorkflowOutput(
    instance: WorkflowInstance,
  ): Record<string, any> {
    // Find the last step that generates output
    const lastStep =
      instance.state.stepExecutions[instance.state.stepExecutions.length - 1];
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

  // async resumeWorkflow(instanceId: string): Promise<WorkflowInstance> {
  //   const instance = await this.workflowInstanceRepo.findOne({
  //     where: { id: instanceId },
  //   });

  //   if (!instance) {
  //     throw new Error(`Workflow instance ${instanceId} not found`);
  //   }

  //   instance.status = WorkflowStatus.RUNNING;
  //   await this.workflowInstanceRepo.save(instance);

  //   // Continue execution
  //   const readySteps = this.findReadySteps(instance);
  //   await this.executeSteps(instance, readySteps);

  //   return instance;
  // }

  // async cancelWorkflow(instanceId: string): Promise<WorkflowInstance> {
  //   const instance = await this.workflowInstanceRepo.findOne({
  //     where: { id: instanceId },
  //   });

  //   if (!instance) {
  //     throw new Error(`Workflow instance ${instanceId} not found`);
  //   }

  //   instance.status = WorkflowStatus.CANCELLED;
  //   return await this.workflowInstanceRepo.save(instance);
  // }

  async completeHumanTask(
    instanceId: string,
    stepKey: string,
    output: Record<string, any>,
  ): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
      relations: ['workflowDefinition'],
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }

    // Find the step execution
    const stepExecution = instance.state.stepExecutions.find((s) => s.stepId === stepKey && s.status === StepStatus.PENDING);

    if (!stepExecution) {
      throw new BadRequestException(`No pending human task found for step ${stepKey}`);
    }

    // Update step execution
    stepExecution.status = StepStatus.COMPLETED;
    stepExecution.output = output;
    stepExecution.endTime = new Date();

    // Update workflow variables if output mapping exists
    const step = await this.workflowStepRepo.findOne({
      where: { key: stepKey },
    });

    if (step?.config?.outputMapping) {
      for (const [key, path] of Object.entries(step.config.outputMapping)) {
        instance.state.variables[key] = output[path];
      }
    }

    await this.workflowInstanceRepo.save(instance);

    // Continue workflow execution if there are more steps
    const steps = await this.workflowStepRepo.find({
      where: { workflowDefinitionId: instance.workflowDefinitionId },
      order: { key: 'ASC' },
    });

    const readySteps = this.findReadySteps(instance, steps);
    if (readySteps.length > 0) {
      await this.executeSteps(instance, readySteps, steps);
    } else if (this.isWorkflowComplete(instance, steps)) {
      instance.status = WorkflowStatus.COMPLETED;
      instance.completedAt = new Date();
      instance.output = this.generateWorkflowOutput(instance);
      await this.workflowInstanceRepo.save(instance);
    }

    return instance;
  }
}
