import { Controller, Get, Post, Param, Render, Res } from '@nestjs/common';
import { WorkflowService } from '../workflow/workflow.service';
import { Response } from 'express';

@Controller('views') // Added 'views' to the controller path
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

    return {
      stats: {
        activeWorkflows,
        pendingApprovals: pendingTasks.length,
      },
      pendingTasks: pendingTasks.map((task) => ({
        id: task.id,
        type: task.type,
        summary: `Task for workflow ${task.workflowInstanceId}`,
      })),
      activities,
    };
  }

  @Post('/tasks/:id/approve')
  async approveTask(@Param('id') id: string, @Res() res: Response) {
    await this.workflowService.approveTask(id);
    res.redirect('/views'); // Updated redirect path
  }

  @Post('/tasks/:id/reject')
  async rejectTask(@Param('id') id: string, @Res() res: Response) {
    await this.workflowService.rejectTask(id);
    res.redirect('/views'); // Updated redirect path
  }
}
