// NestJS imports
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';

// DTOs
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';

// Enums and Interfaces
import { WorkflowStatus } from './enums/workflow-status.enum';
import { StepStatus } from './enums/step-status.enum';
import { WorkflowStep } from './interfaces/workflow-step.interface';

interface TaskDto {
  id: string;
  name: string;
  status: StepStatus;
  form: any;
}

interface CompletedStep {
  stepId: string;
  name: string;
  type: string;
  config: any;
  status: StepStatus;
  output: any;
  endTime: Date;
  error?: string;
}

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

  async findInstancesByStatus(status: WorkflowStatus): Promise<WorkflowInstance[]> {
    return this.workflowInstanceRepo.find({
      where: { status },
      relations: ['workflowDefinition'],
    });
  }

  async findInstances(): Promise<WorkflowInstance[]> {
    return this.workflowInstanceRepo.find({
      relations: ['workflowDefinition'],
    });
  }

  async getInstance(instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: instanceId },
      relations: ['workflowDefinition'],
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }

    return instance;
  }

  async approveInstanceStep(instanceId: string, stepId: string): Promise<void> {
    const instance = await this.getInstance(instanceId);

    const step = instance.state.currentSteps?.find((s) => s.stepId === stepId);
    if (step) {
      const completedStep = {
        ...step,
        output: { approved: true, status: StepStatus.COMPLETED },
        endTime: new Date()
      };

      instance.state.completedSteps = [
        ...(instance.state.completedSteps || []),
        completedStep,
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

  async rejectInstanceStep(instanceId: string, stepId: string, reason: string): Promise<void> {
    const instance = await this.getInstance(instanceId);

    const stepIndex = instance.state.currentSteps.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) {
      throw new NotFoundException(`Step ${stepId} not found in workflow ${instanceId}`);
    }

    // Update step status and error
    instance.state.currentSteps[stepIndex].status = StepStatus.FAILED;
    instance.state.currentSteps[stepIndex].error = reason;
    instance.state.currentSteps[stepIndex].endTime = new Date();

    // Update workflow status
    instance.status = WorkflowStatus.FAILED;

    await this.workflowInstanceRepo.save(instance);
  }

  async completeInstanceStep(instanceId: string, stepId: string, formData: Record<string, any>): Promise<void> {
    const instance = await this.getInstance(instanceId);

    const stepIndex = instance.state.currentSteps.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) {
      throw new NotFoundException(`Step ${stepId} not found in workflow ${instanceId}`);
    }

    // Update step status and output
    const completedStep = {
      ...instance.state.currentSteps[stepIndex],
      status: StepStatus.COMPLETED,
      output: formData,
      endTime: new Date(),
    };

    // Remove from current steps and add to completed steps
    instance.state.currentSteps.splice(stepIndex, 1);
    instance.state.completedSteps.push(completedStep);

    await this.workflowInstanceRepo.save(instance);
  }
}
