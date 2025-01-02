import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance, WorkflowStatus, StepStatus } from './entities/workflow-instance.entity';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepo: Repository<WorkflowInstance>,
  ) {}

  async create(
    createDto: CreateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    const workflow = this.workflowDefinitionRepo.create(createDto);
    return await this.workflowDefinitionRepo.save(workflow);
  }

  async findAll(): Promise<WorkflowDefinition[]> {
    return await this.workflowDefinitionRepo.find();
  }

  async findOne(id: string): Promise<WorkflowDefinition> {
    return this.workflowDefinitionRepo.findOneBy({ id });
  }

  async update(
    id: string,
    updateDto: UpdateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    const workflow = await this.findOne(id);
    Object.assign(workflow, updateDto);
    return await this.workflowDefinitionRepo.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowDefinitionRepo.remove(workflow);
  }

  async findInstanceById(id: string): Promise<WorkflowInstance> {
    return this.workflowInstanceRepo.findOne({
      where: { id },
      relations: ['workflowDefinition'],
    });
  }

  async findAllInstances(): Promise<WorkflowInstance[]> {
    return this.workflowInstanceRepo.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findPendingTasks(): Promise<any[]> {
    const instances = await this.workflowInstanceRepo.find({
      where: {
        status: WorkflowStatus.RUNNING,
      },
      relations: ['workflowDefinition'],
    });

    const pendingTasks = [];
    for (const instance of instances) {
      const currentSteps = instance.state.currentSteps || [];
      for (const step of currentSteps) {
        if (step.type === 'TASK' && step.config?.type === 'human') {
          pendingTasks.push({
            id: `${instance.id}-${step.stepId}`,
            type: step.name,
            workflowInstanceId: instance.id,
            stepId: step.stepId,
            status: StepStatus.PENDING,
          });
        }
      }
    }
    return pendingTasks;
  }

  async approveTask(taskId: string): Promise<void> {
    const [instanceId, stepId] = taskId.split('-');
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }

    // Find the step and update its status
    const step = instance.state.currentSteps?.find(s => s.stepId === stepId);
    if (step) {
      step.output = { approved: true, status: StepStatus.COMPLETED };
      instance.state.completedSteps = [...(instance.state.completedSteps || []), step];
      instance.state.currentSteps = instance.state.currentSteps.filter(s => s.stepId !== stepId);
      
      await this.workflowInstanceRepo.save(instance);
      
      // Continue workflow execution if there are more steps
      if (instance.state.currentSteps.length === 0) {
        instance.status = WorkflowStatus.COMPLETED;
        await this.workflowInstanceRepo.save(instance);
      }
    }
  }

  async rejectTask(taskId: string): Promise<void> {
    const [instanceId, stepId] = taskId.split('-');
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }

    // Find the step and update its status
    const step = instance.state.currentSteps?.find(s => s.stepId === stepId);
    if (step) {
      step.output = { approved: false, status: StepStatus.FAILED };
      instance.state.completedSteps = [...(instance.state.completedSteps || []), step];
      instance.state.currentSteps = instance.state.currentSteps.filter(s => s.stepId !== stepId);
      instance.status = WorkflowStatus.FAILED;
      
      await this.workflowInstanceRepo.save(instance);
    }
  }

  async validateWorkflowDefinition(
    workflow: WorkflowDefinition,
  ): Promise<boolean> {
    // Validate steps have unique IDs
    const stepIds = new Set();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Validate dependencies exist
    for (const step of workflow.steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          throw new Error(`Step ${step.id} has invalid dependency: ${depId}`);
        }
      }
    }

    // Check for circular dependencies
    this.checkCircularDependencies(workflow.steps);

    return true;
  }

  private checkCircularDependencies(steps: any[]): void {
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (stepId: string) => {
      if (recursionStack.has(stepId)) {
        throw new Error(
          `Circular dependency detected involving step: ${stepId}`,
        );
      }
      if (visited.has(stepId)) return;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find((s) => s.id === stepId);
      for (const depId of step.dependencies) {
        dfs(depId);
      }

      recursionStack.delete(stepId);
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        dfs(step.id);
      }
    }
  }
}
