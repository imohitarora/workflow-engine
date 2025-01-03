import { Controller, Get, Post, Param, Render, Res, Body } from '@nestjs/common';
import { WorkflowService } from '../workflow/workflow.service';
import { Response } from 'express';

@Controller('views')
export class ViewsController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @Render('dashboard')
  async getDashboard() {
    const [instances, pendingTasks] = await Promise.all([
      this.workflowService.findAllInstances(),
      this.workflowService.findPendingTasks(),
    ]);

    const activeWorkflows = instances.filter(
      (instance) => instance.status === 'RUNNING',
    ).length;

    const activities = instances.slice(0, 10).map((instance) => ({
      description: `Workflow ${instance.id} - ${instance.status}`,
      timestamp: instance.createdAt,
    }));

    // Group tasks by type for better organization
    const groupedTasks = pendingTasks.reduce((acc, task) => {
      const group = acc[task.type] || [];
      group.push({
        id: task.id,
        type: task.type,
        summary: `${task.type} for Loan ${task.workflowInstanceId}`,
        businessId: task.businessId,
        created: task.created,
      });
      acc[task.type] = group;
      return acc;
    }, {});

    return {
      stats: {
        activeWorkflows,
        pendingApprovals: pendingTasks.length,
      },
      taskGroups: [
        {
          name: 'Application Validation',
          tasks: groupedTasks['Validate Loan Application'] || [],
        },
        {
          name: 'Credit Checks',
          tasks: groupedTasks['Credit Score Check'] || [],
        },
        {
          name: 'Risk Assessments',
          tasks: groupedTasks['Risk Assessment'] || [],
        },
        {
          name: 'Final Decisions',
          tasks: groupedTasks['Loan Decision'] || [],
        },
      ],
      activities,
    };
  }

  @Get('/tasks/:id')
  @Render('task-form')
  async getTaskForm(@Param('id') id: string) {
    const task = await this.workflowService.getTaskDetails(id);
    return {
      task,
      formConfig: task.config.form,
      inputData: task.inputData,
    };
  }

  @Post('/tasks/:id/complete')
  async completeTask(
    @Param('id') id: string,
    @Body() formData: any,
    @Res() res: Response,
  ) {
    await this.workflowService.completeTask(id, formData);
    res.redirect('/views');
  }

  @Post('/tasks/:id/reject')
  async rejectTask(
    @Param('id') id: string,
    @Body() reason: string,
    @Res() res: Response,
  ) {
    await this.workflowService.rejectTask(id, reason);
    res.redirect('/views');
  }
}
