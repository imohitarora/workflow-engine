import {
  Body, Controller, Get, NotFoundException,
  Param, Post, HttpCode, HttpStatus
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { RejectTaskDto } from './dto/reject-task.dto';
import { TaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({ status: 200, type: [TaskDto] })
  async getTasks(): Promise<TaskDto[]> {
    return this.tasksService.getAllTasks();
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending tasks' })
  @ApiResponse({ status: 200, type: [TaskDto] })
  async getPendingTasks(): Promise<TaskDto[]> {
    return this.tasksService.findPendingTasks();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details' })
  @ApiResponse({ status: 200, type: TaskDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTask(@Param('id') id: string): Promise<TaskDto> {
    const task = await this.tasksService.getTask(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a task' })
  @ApiResponse({ status: 200, description: 'Task completed successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    console.log('completeTaskDto', completeTaskDto, id);
    await this.tasksService.completeTask(id, completeTaskDto.formData);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a task' })
  @ApiResponse({ status: 200, description: 'Task rejected successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async rejectTask(
    @Param('id') id: string,
    @Body() rejectTaskDto: RejectTaskDto,
  ): Promise<void> {
    await this.tasksService.rejectTask(id, rejectTaskDto.formData);
  }
}
