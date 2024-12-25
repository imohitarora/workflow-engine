import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance, WorkflowStatus, StepStatus } from './entities/workflow-instance.entity';
import { WorkflowDefinition, StepType } from './entities/workflow-definition.entity';
import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepo: Repository<WorkflowInstance>,
    private workflowService: WorkflowService,
  ) {}

  async startWorkflow(
    workflowDefinitionId: string,
    input: Record<string, any>,
  ): Promise<WorkflowInstance> {
    const definition = await this.workflowService.findOne(workflowDefinitionId);
    
    const instance = this.workflowInstanceRepo.create({
      workflowDefinitionId,
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
    
    const completedStepIds = new Set(completedSteps.map(s => s.stepId));
    const runningStepIds = new Set(currentSteps.map(s => s.stepId));

    return steps
      .filter(step => {
        // Skip if step is already completed or running
        if (completedStepIds.has(step.id) || runningStepIds.has(step.id)) {
          return false;
        }

        // Check if all dependencies are completed
        return step.dependencies.every(depId => completedStepIds.has(depId));
      })
      .map(step => step.id);
  }

  private async executeSteps(instance: WorkflowInstance, stepIds: string[]): Promise<void> {
    const steps = stepIds.map(id => 
      instance.workflowDefinition.steps.find(s => s.id === id)
    );

    for (const step of steps) {
      try {
        // Add step to current steps
        instance.state.currentSteps.push({
          stepId: step.id,
          status: StepStatus.RUNNING,
          startTime: new Date(),
          attempts: 0,
        });

        await this.workflowInstanceRepo.save(instance);

        // Execute step based on type
        let result;
        switch (step.type) {
          case StepType.TASK:
            result = await this.executeTask(instance, step);
            break;
          case StepType.DECISION:
            result = await this.executeDecision(instance, step);
            break;
          case StepType.PARALLEL:
            result = await this.executeParallel(instance, step);
            break;
          default:
            throw new Error(`Unsupported step type: ${step.type}`);
        }

        // Update step status to completed
        const stepState = instance.state.currentSteps.find(s => s.stepId === step.id);
        stepState.status = StepStatus.COMPLETED;
        stepState.endTime = new Date();
        stepState.output = result;

        // Move step from current to completed
        instance.state.completedSteps.push(stepState);
        instance.state.currentSteps = instance.state.currentSteps.filter(
          s => s.stepId !== step.id
        );

        // Update instance state
        instance.state.variables = {
          ...instance.state.variables,
          [step.id]: result,
        };

        await this.workflowInstanceRepo.save(instance);

        // Check if workflow is complete
        if (this.isWorkflowComplete(instance)) {
          instance.status = WorkflowStatus.COMPLETED;
          instance.completedAt = new Date();
          instance.output = this.generateWorkflowOutput(instance);
          await this.workflowInstanceRepo.save(instance);
        } else {
          // Continue with next ready steps
          const nextSteps = this.findReadySteps(instance);
          if (nextSteps.length > 0) {
            await this.executeSteps(instance, nextSteps);
          }
        }
      } catch (error) {
        this.logger.error(`Error executing step ${step.id}:`, error);
        
        const stepState = instance.state.currentSteps.find(s => s.stepId === step.id);
        stepState.status = StepStatus.FAILED;
        stepState.error = error.message;
        
        if (step.retryConfig && stepState.attempts < step.retryConfig.maxAttempts) {
          // Implement retry logic
          stepState.attempts += 1;
          const delay = step.retryConfig.initialDelay * Math.pow(step.retryConfig.backoffMultiplier, stepState.attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          await this.executeSteps(instance, [step.id]);
        } else {
          instance.status = WorkflowStatus.FAILED;
          await this.workflowInstanceRepo.save(instance);
          throw error;
        }
      }
    }
  }

  private async executeTask(instance: WorkflowInstance, step: any): Promise<any> {
    // Here you would implement the actual task execution logic
    // This could involve calling external services, running computations, etc.
    return null;
  }

  private async executeDecision(instance: WorkflowInstance, step: any): Promise<any> {
    if (step.condition.type === 'javascript') {
      // Evaluate JavaScript expression
      const result = new Function('context', `return ${step.condition.expression}`)(
        instance.state.variables
      );
      return result;
    } else if (step.condition.type === 'jsonpath') {
      // Implement JSONPath evaluation
      return null;
    }
    return null;
  }

  private async executeParallel(instance: WorkflowInstance, step: any): Promise<any> {
    // Implement parallel execution logic
    return null;
  }

  private isWorkflowComplete(instance: WorkflowInstance): boolean {
    const totalSteps = instance.workflowDefinition.steps.length;
    return instance.state.completedSteps.length === totalSteps;
  }

  private generateWorkflowOutput(instance: WorkflowInstance): Record<string, any> {
    const output: Record<string, any> = {};
    const { outputSchema } = instance.workflowDefinition;
    
    // Map the final state variables to the output schema
    for (const [key, mapping] of Object.entries(outputSchema)) {
      if (typeof mapping === 'string' && mapping in instance.state.variables) {
        output[key] = instance.state.variables[mapping];
      }
    }
    
    return output;
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
