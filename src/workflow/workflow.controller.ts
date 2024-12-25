import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { StartWorkflowDto } from './dto/start-workflow.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutionService: WorkflowExecutionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow definition' })
  @ApiResponse({ 
    status: 201, 
    description: 'The workflow definition has been created successfully.',
    type: WorkflowDefinition
  })
  create(@Body() createWorkflowDto: CreateWorkflowDefinitionDto) {
    return this.workflowService.create(createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflow definitions' })
  @ApiResponse({ 
    status: 200,
    description: 'List of all workflow definitions',
    type: [WorkflowDefinition]
  })
  findAll() {
    return this.workflowService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow definition by id' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  @ApiResponse({ 
    status: 200,
    description: 'The workflow definition has been found',
    type: WorkflowDefinition
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow definition not found'
  })
  findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow definition' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  @ApiResponse({ 
    status: 200,
    description: 'The workflow definition has been updated',
    type: WorkflowDefinition
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow definition not found'
  })
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDefinitionDto,
  ) {
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workflow definition' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  @ApiResponse({ 
    status: 204,
    description: 'The workflow definition has been deleted'
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow definition not found'
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.workflowService.remove(id);
  }

  @Post('execute')
  @ApiOperation({ summary: 'Start a new workflow execution' })
  @ApiResponse({ 
    status: 201,
    description: 'The workflow execution has started',
    type: WorkflowInstance
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow definition not found'
  })
  startWorkflow(@Body() startWorkflowDto: StartWorkflowDto) {
    return this.workflowExecutionService.startWorkflow(
      startWorkflowDto.workflowDefinitionId,
      startWorkflowDto.input,
    );
  }

  @Post(':instanceId/pause')
  @ApiOperation({ summary: 'Pause a running workflow' })
  @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  @ApiResponse({ 
    status: 200,
    description: 'The workflow has been paused',
    type: WorkflowInstance
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow instance not found'
  })
  pauseWorkflow(@Param('instanceId') instanceId: string) {
    return this.workflowExecutionService.pauseWorkflow(instanceId);
  }

  @Post(':instanceId/resume')
  @ApiOperation({ summary: 'Resume a paused workflow' })
  @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  @ApiResponse({ 
    status: 200,
    description: 'The workflow has been resumed',
    type: WorkflowInstance
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow instance not found'
  })
  resumeWorkflow(@Param('instanceId') instanceId: string) {
    return this.workflowExecutionService.resumeWorkflow(instanceId);
  }

  @Post(':instanceId/cancel')
  @ApiOperation({ summary: 'Cancel a workflow' })
  @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  @ApiResponse({ 
    status: 200,
    description: 'The workflow has been cancelled',
    type: WorkflowInstance
  })
  @ApiResponse({ 
    status: 404,
    description: 'Workflow instance not found'
  })
  cancelWorkflow(@Param('instanceId') instanceId: string) {
    return this.workflowExecutionService.cancelWorkflow(instanceId);
  }
}
