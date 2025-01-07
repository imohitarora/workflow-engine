// src/tasks/tasks.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskExecution } from './entities/task-execution.entity';
import { WorkflowService } from '../workflow/workflow.service';
import { TaskStatus } from './enums/task-status.enum';
import { TaskDto } from './dto/task.dto';
import { StepType } from '../workflow/enums/step-type.enum';
import { WorkflowStatus } from '../workflow/enums/workflow-status.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskExecution)
    private taskExecutionRepo: Repository<TaskExecution>,
    private readonly workflowService: WorkflowService,
  ) {}

  async findPendingTasks(): Promise<TaskDto[]> {
    const instances = await this.workflowService.findInstancesByStatus(
      WorkflowStatus.RUNNING,
    );

    const pendingTasks: TaskDto[] = [];
    for (const instance of instances) {
      const currentSteps = instance.state.currentSteps || [];
      for (const step of currentSteps) {
        if (step.type === StepType.TASK && step.config?.type === 'human') {
          // Check if task already exists
          let taskExecution = await this.taskExecutionRepo.findOne({
            where: {
              workflowInstanceId: instance.id,
              stepId: step.stepId,
              status: TaskStatus.PENDING,
            },
          });

          if (!taskExecution) {
            taskExecution = await this.taskExecutionRepo.save({
              workflowInstanceId: instance.id,
              stepId: step.stepId,
              name: step.name,
              status: TaskStatus.PENDING,
            });
          }

          pendingTasks.push(this.mapToTaskDto(taskExecution, step));
        }
      }
    }
    return pendingTasks;
  }

  async getAllTasks(): Promise<TaskDto[]> {
    const tasks = await this.taskExecutionRepo.find({
      relations: ['workflowInstance'],
      order: { createdAt: 'DESC' },
    });

    return tasks.map(task => {
      const instance = task.workflowInstance;
      const step = instance.workflowDefinition.steps.find(s => s.id === task.stepId);
      return this.mapToTaskDto(task, step);
    });
  }

  async getTask(taskId: string): Promise<TaskDto> {
    const taskExecution = await this.taskExecutionRepo.findOne({
      where: { id: taskId },
      relations: ['workflowInstance'],
    });

    if (!taskExecution) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const instance = taskExecution.workflowInstance;
    const step = instance.workflowDefinition.steps.find(
      s => s.id === taskExecution.stepId
    );

    return this.mapToTaskDto(taskExecution, step);
  }

  async completeTask(taskId: string, formData: Record<string, any>): Promise<void> {
    const taskExecution = await this.taskExecutionRepo.findOne({
      where: { id: taskId },
    });

    if (!taskExecution) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Update task execution
    taskExecution.status = TaskStatus.COMPLETED;
    taskExecution.formData = formData;
    await this.taskExecutionRepo.save(taskExecution);

    // Complete the workflow step
    await this.workflowService.completeInstanceStep(
      taskExecution.workflowInstanceId,
      taskExecution.stepId,
      formData,
    );
  }

  async rejectTask(taskId: string, comments: string): Promise<void> {
    const taskExecution = await this.taskExecutionRepo.findOne({
      where: { id: taskId },
    });

    if (!taskExecution) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Update task execution
    taskExecution.status = TaskStatus.REJECTED;
    taskExecution.comments = comments;
    await this.taskExecutionRepo.save(taskExecution);

    // Reject the workflow step
    await this.workflowService.rejectInstanceStep(
      taskExecution.workflowInstanceId,
      taskExecution.stepId,
      { comments }
    );
  }

  async getTaskDetails(taskId: string): Promise<any> {
    const taskExecution = await this.taskExecutionRepo.findOne({
      where: { id: taskId },
      relations: ['workflowInstance'],
    });

    if (!taskExecution) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const instance = taskExecution.workflowInstance;
    const workflowStep = instance.workflowDefinition.steps.find(
      s => s.id === taskExecution.stepId
    );

    return {
      id: taskExecution.id,
      businessId: instance.businessId,
      workflowInstanceId: taskExecution.workflowInstanceId,
      stepId: taskExecution.stepId,
      type: workflowStep.type,
      name: taskExecution.name,
      status: taskExecution.status,
      config: workflowStep.config,
      inputData: this.resolveInputData(instance, workflowStep),
      formData: taskExecution.formData,
      comments: taskExecution.comments,
      createdAt: taskExecution.createdAt,
      updatedAt: taskExecution.updatedAt,
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

  private mapToTaskDto(taskExecution: TaskExecution, step: any): TaskDto {
    return {
      id: taskExecution.id,
      name: taskExecution.name,
      workflowInstanceId: taskExecution.workflowInstanceId,
      stepId: taskExecution.stepId,
      status: taskExecution.status,
      type: step?.config?.type,
      form: step?.config?.form,
      formData: taskExecution.formData,
      comments: taskExecution.comments,
      createdAt: taskExecution.createdAt,
      updatedAt: taskExecution.updatedAt,
    };
  }
}