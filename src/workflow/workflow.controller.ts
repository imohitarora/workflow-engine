import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { StartWorkflowDto } from './dto/start-workflow.dto';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowService } from './workflow.service';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutionService: WorkflowExecutionService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new workflow definition' })
  @ApiResponse({
    status: 201,
    description: 'The workflow definition has been created successfully.',
    type: WorkflowDefinition,
  })
  @ApiBody({
    description: 'Workflow definition creation payload',
    examples: {
      testApprovalWorkflow: {
        summary: 'Test Approval Workflow',
        value: {
          name: 'Test Approval Workflow',
          description: 'A workflow for testing approval process',
          inputSchema: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              amount: { type: 'number' },
            },
            required: ['requestId', 'amount'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              approved: { type: 'boolean' },
              comments: { type: 'string' },
            },
          },
          steps: [
            {
              key: 'step1',
              name: 'Initial Review',
              type: 'TASK',
              dependencies: [],
              config: {
                type: 'human',
                handler: 'approvalTask',
                inputMapping: {
                  requestId: '$.input.requestId',
                  amount: '$.input.amount',
                },
                outputMapping: {
                  approved: '$.output.approved',
                  comments: '$.output.comments',
                },
              },
            },
          ],
        },
      },
    },
  })
  create(@Body() createWorkflowDto: CreateWorkflowDefinitionDto) {
    return this.workflowService.create(createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflow definitions' })
  @ApiResponse({
    status: 200,
    description: 'List of all workflow definitions',
    type: [WorkflowDefinition],
  })
  findAll() {
    return this.workflowService.findAll();
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a workflow definition by id' })
  // @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'The workflow definition has been found',
  //   type: WorkflowDefinition,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Workflow definition not found',
  // })
  // findOne(@Param('id') id: string) {
  //   return this.workflowService.findOne(id);
  // }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a workflow definition' })
  // @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'The workflow definition has been updated',
  //   type: WorkflowDefinition,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Workflow definition not found',
  // })
  // @ApiBody({
  //   description: 'Workflow definition update payload',
  //   examples: {
  //     updateSteps: {
  //       summary: 'Update workflow steps',
  //       value: {
  //         steps: [
  //           {
  //             id: 'send-email',
  //             name: 'Send Email Notification',
  //             type: 'TASK',
  //             dependencies: [],
  //             config: {
  //               handler: 'newEmailHandler',
  //               inputMapping: {
  //                 to: '$.input.email',
  //                 template: '$.input.templateId',
  //               },
  //               outputMapping: {
  //                 sent: '$.output.success',
  //               },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     updateDescription: {
  //       summary: 'Update workflow description',
  //       value: {
  //         description: 'Updated workflow description with new functionality',
  //       },
  //     },
  //   },
  // })
  // update(
  //   @Param('id') id: string,
  //   @Body() updateWorkflowDto: UpdateWorkflowDefinitionDto,
  // ) {
  //   return this.workflowService.update(id, updateWorkflowDto);
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a workflow definition' })
  // @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  // @ApiResponse({
  //   status: 204,
  //   description: 'The workflow definition has been deleted',
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Workflow definition not found',
  // })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // remove(@Param('id') id: string) {
  //   return this.workflowService.remove(id);
  // }

  @Post('start')
  @ApiOperation({ summary: 'Start a new workflow instance' })
  @ApiResponse({
    status: 201,
    description: 'The workflow instance has been created successfully.',
    type: WorkflowInstance,
  })
  async startWorkflow(
    @Body() startWorkflowDto: StartWorkflowDto,
  ): Promise<WorkflowInstance> {
    return this.workflowExecutionService.startWorkflow(
      startWorkflowDto.workflowDefinitionId,
      startWorkflowDto.businessId,
      startWorkflowDto.input,
    );
  }

  @Post(':instanceId/steps/:stepKey/complete')
  @ApiOperation({ summary: 'Complete a human task' })
  @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  @ApiParam({ name: 'stepKey', description: 'Step key' })
  @ApiBody({ description: 'Task output data' })
  @ApiResponse({
    status: 200,
    description: 'The human task has been completed',
    type: WorkflowInstance,
  })
  async completeHumanTask(
    @Param('instanceId') instanceId: string,
    @Param('stepKey') stepKey: string,
    @Body() output: Record<string, any>,
  ) {
    return await this.workflowExecutionService.completeHumanTask(
      instanceId,
      stepKey,
      output,
    );
  }

  @Get('instances')
  @ApiOperation({ summary: 'Get all workflow instances' })
  @ApiResponse({
    status: 200,
    description: 'List of all workflow instances',
    type: [WorkflowInstance],
  })
  async getWorkflowInstances(): Promise<WorkflowInstance[]> {
    return this.workflowService.findAllInstances();
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get workflow instance details' })
  @ApiResponse({
    status: 200,
    description: 'The workflow instance details',
    type: WorkflowInstance,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow instance not found',
  })
  async getWorkflowInstance(
    @Param('id') id: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.workflowService.getInstance(id);
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }
    return instance;
  }

  @Post(':instanceId/pause')
  @ApiOperation({ summary: 'Pause a running workflow' })
  @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  @ApiResponse({
    status: 200,
    description: 'The workflow has been paused',
    type: WorkflowInstance,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow instance not found',
  })
  pauseWorkflow(@Param('instanceId') instanceId: string) {
    return this.workflowExecutionService.pauseWorkflow(instanceId);
  }

  // @Post(':instanceId/resume')
  // @ApiOperation({ summary: 'Resume a paused workflow' })
  // @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'The workflow has been resumed',
  //   type: WorkflowInstance,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Workflow instance not found',
  // })
  // resumeWorkflow(@Param('instanceId') instanceId: string) {
  //   return this.workflowExecutionService.resumeWorkflow(instanceId);
  // }

  // @Post(':instanceId/cancel')
  // @ApiOperation({ summary: 'Cancel a workflow' })
  // @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'The workflow has been cancelled',
  //   type: WorkflowInstance,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Workflow instance not found',
  // })
  // cancelWorkflow(@Param('instanceId') instanceId: string) {
  //   return this.workflowExecutionService.cancelWorkflow(instanceId);
  // }
}
