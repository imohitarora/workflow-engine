import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepo: Repository<WorkflowDefinition>,
  ) {}

  async create(createDto: CreateWorkflowDefinitionDto): Promise<WorkflowDefinition> {
    const workflow = this.workflowDefinitionRepo.create(createDto);
    return await this.workflowDefinitionRepo.save(workflow);
  }

  async findAll(): Promise<WorkflowDefinition[]> {
    return await this.workflowDefinitionRepo.find();
  }

  async findOne(id: string): Promise<WorkflowDefinition> {
    const workflow = await this.workflowDefinitionRepo.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Workflow definition with ID "${id}" not found`);
    }
    return workflow;
  }

  async update(id: string, updateDto: UpdateWorkflowDefinitionDto): Promise<WorkflowDefinition> {
    const workflow = await this.findOne(id);
    Object.assign(workflow, updateDto);
    return await this.workflowDefinitionRepo.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowDefinitionRepo.remove(workflow);
  }

  async validateWorkflowDefinition(workflow: WorkflowDefinition): Promise<boolean> {
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
        throw new Error(`Circular dependency detected involving step: ${stepId}`);
      }
      if (visited.has(stepId)) return;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
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
