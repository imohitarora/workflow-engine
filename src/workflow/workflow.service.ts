import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import {
  StepStatus,
  WorkflowInstance,
  WorkflowStatus,
} from './entities/workflow-instance.entity';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepo: Repository<WorkflowInstance>,
  ) { }

  async create(
    createDto: CreateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    // Convert DTO to entity
    const workflow = this.workflowDefinitionRepo.create({
      name: createDto.name,
      description: createDto.description,
      steps: createDto.steps.map((step) => ({
        ...step,
        config: step.config ? {
          ...step.config,
          type: step.config.type as 'human' | 'script' | 'http',
        } : undefined,
      })),
      inputSchema: createDto.inputSchema,
      outputSchema: createDto.outputSchema,
    });

    // Save and return the created workflow
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
    const step = instance.state.currentSteps?.find((s) => s.stepId === stepId);
    if (step) {
      step.output = { approved: true, status: StepStatus.COMPLETED };
      instance.state.completedSteps = [
        ...(instance.state.completedSteps || []),
        step,
      ];
      instance.state.currentSteps = instance.state.currentSteps.filter(
        (s) => s.stepId !== stepId,
      );

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
    const step = instance.state.currentSteps?.find((s) => s.stepId === stepId);
    if (step) {
      step.output = { approved: false, status: StepStatus.FAILED };
      instance.state.completedSteps = [
        ...(instance.state.completedSteps || []),
        step,
      ];
      instance.state.currentSteps = instance.state.currentSteps.filter(
        (s) => s.stepId !== stepId,
      );
      instance.status = WorkflowStatus.FAILED;

      await this.workflowInstanceRepo.save(instance);
    }
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
}
