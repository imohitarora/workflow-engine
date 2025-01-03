import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowService } from './workflow.service';
import { TaskDto } from '../tasks/dto/task.dto';
import { CompleteTaskDto } from '../tasks/dto/complete-task.dto';
import { RejectTaskDto } from '../tasks/dto/reject-task.dto';

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
      emailWorkflow: {
        summary: 'Email Notification Workflow',
        value: {
          name: 'Email Notification Workflow',
          description: 'Sends email notifications with optional retry logic',
          steps: [
            {
              id: 'send-email',
              name: 'Send Email Notification',
              type: 'TASK',
              dependencies: [],
              config: {
                handler: 'emailHandler',
                inputMapping: {
                  to: '$.input.email',
                  subject: '$.input.subject',
                  body: '$.input.body',
                },
                outputMapping: {
                  sent: '$.output.success',
                  messageId: '$.output.messageId',
                },
              },
              retryConfig: {
                maxAttempts: 3,
                backoffMultiplier: 2,
                initialDelay: 1000,
              },
            },
          ],
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['email', 'subject', 'body'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              sent: { type: 'boolean' },
              messageId: { type: 'string' },
            },
          },
        },
      },
      orderProcessing: {
        summary: 'Order Processing Workflow',
        value: {
          name: 'Order Processing Workflow',
          description: 'Processes an order with payment and shipping steps',
          steps: [
            {
              id: 'validate-order',
              name: 'Validate Order',
              type: 'TASK',
              dependencies: [],
              config: {
                handler: 'orderValidator',
                inputMapping: {
                  orderId: '$.input.orderId',
                  items: '$.input.items',
                },
                outputMapping: {
                  valid: '$.output.isValid',
                  total: '$.output.total',
                },
              },
            },
            {
              id: 'process-payment',
              name: 'Process Payment',
              type: 'TASK',
              dependencies: ['validate-order'],
              config: {
                handler: 'paymentProcessor',
                inputMapping: {
                  amount: '$.steps.validate-order.output.total',
                  paymentMethod: '$.input.paymentMethod',
                },
                outputMapping: {
                  success: '$.output.success',
                  transactionId: '$.output.transactionId',
                },
              },
            },
          ],
          inputSchema: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    quantity: { type: 'number' },
                  },
                },
              },
              paymentMethod: { type: 'string' },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              transactionId: { type: 'string' },
            },
          },
        },
      },
      loanProcessing: {
        summary: 'Loan Processing Workflow',
        value: {
          name: 'Loan Processing Workflow',
          description:
            'Processes loan applications with credit check and risk assessment',
          steps: [
            {
              id: 'validate-application',
              name: 'Validate Loan Application',
              type: 'human',
              dependencies: [],
              config: {
                type: 'human',
                handler: 'validateLoanApplication',
                inputMapping: {
                  applicantName: '$.input.applicantName',
                  income: '$.input.income',
                  loanAmount: '$.input.loanAmount',
                  loanTerm: '$.input.loanTerm',
                  ssn: '$.input.ssn'
                },
                outputMapping: {
                  isValid: '$.output.isValid',
                  validationErrors: '$.output.errors',
                  notes: '$.output.notes'
                },
                form: {
                  title: 'Validate Loan Application',
                  fields: [
                    {
                      name: 'isValid',
                      label: 'Application Valid?',
                      type: 'boolean',
                      required: true
                    },
                    {
                      name: 'errors',
                      label: 'Validation Errors',
                      type: 'array',
                      items: { type: 'string' },
                      showIf: 'isValid === false'
                    },
                    {
                      name: 'notes',
                      label: 'Additional Notes',
                      type: 'text',
                      multiline: true
                    }
                  ]
                }
              },
              timeout: 172800000, // 48 hours for human task
            },
            {
              id: 'check-credit',
              name: 'Credit Score Check',
              type: 'human',
              dependencies: ['validate-application'],
              config: {
                type: 'human',
                handler: 'performCreditCheck',
                inputMapping: {
                  applicantName: '$.input.applicantName',
                  ssn: '$.input.ssn'
                },
                outputMapping: {
                  creditScore: '$.output.score',
                  creditReport: '$.output.report',
                  manualCheckNotes: '$.output.notes'
                },
                form: {
                  title: 'Credit Score Check',
                  fields: [
                    {
                      name: 'score',
                      label: 'Credit Score',
                      type: 'number',
                      required: true,
                      min: 300,
                      max: 850
                    },
                    {
                      name: 'report',
                      label: 'Credit Report Details',
                      type: 'object',
                      properties: {
                        delinquencies: { type: 'number' },
                        creditUtilization: { type: 'number' },
                        lengthOfHistory: { type: 'number' }
                      }
                    },
                    {
                      name: 'notes',
                      label: 'Manual Check Notes',
                      type: 'text',
                      multiline: true
                    }
                  ]
                }
              },
              timeout: 172800000, // 48 hours for human task
              condition: {
                type: 'javascript',
                expression: 'steps["validate-application"].output.isValid === true'
              }
            },
            {
              id: 'assess-risk',
              name: 'Risk Assessment',
              type: 'human',
              dependencies: ['check-credit'],
              config: {
                type: 'human',
                handler: 'assessRisk',
                inputMapping: {
                  creditScore: '$.steps.check-credit.output.creditScore',
                  creditReport: '$.steps.check-credit.output.creditReport',
                  income: '$.input.income',
                  loanAmount: '$.input.loanAmount',
                  loanTerm: '$.input.loanTerm'
                },
                outputMapping: {
                  riskLevel: '$.output.riskLevel',
                  recommendedRate: '$.output.recommendedRate',
                  assessmentNotes: '$.output.notes'
                },
                form: {
                  title: 'Risk Assessment',
                  fields: [
                    {
                      name: 'riskLevel',
                      label: 'Risk Level',
                      type: 'select',
                      required: true,
                      options: [
                        { value: 'LOW', label: 'Low Risk' },
                        { value: 'MEDIUM', label: 'Medium Risk' },
                        { value: 'HIGH', label: 'High Risk' }
                      ]
                    },
                    {
                      name: 'recommendedRate',
                      label: 'Recommended Interest Rate (%)',
                      type: 'number',
                      required: true,
                      min: 0,
                      max: 30,
                      step: 0.25
                    },
                    {
                      name: 'notes',
                      label: 'Assessment Notes',
                      type: 'text',
                      multiline: true
                    }
                  ]
                }
              },
              timeout: 172800000 // 48 hours for human task
            },
            {
              id: 'make-decision',
              name: 'Loan Decision',
              type: 'human',
              dependencies: ['assess-risk'],
              config: {
                type: 'human',
                handler: 'makeLoanDecision',
                inputMapping: {
                  riskLevel: '$.steps.assess-risk.output.riskLevel',
                  recommendedRate: '$.steps.assess-risk.output.recommendedRate',
                  creditScore: '$.steps.check-credit.output.creditScore',
                  creditReport: '$.steps.check-credit.output.creditReport',
                  income: '$.input.income',
                  loanAmount: '$.input.loanAmount',
                  loanTerm: '$.input.loanTerm'
                },
                outputMapping: {
                  approved: '$.output.approved',
                  loanId: '$.output.loanId',
                  interestRate: '$.output.interestRate',
                  reason: '$.output.reason',
                  decisionNotes: '$.output.notes'
                },
                form: {
                  title: 'Final Loan Decision',
                  fields: [
                    {
                      name: 'approved',
                      label: 'Approve Loan?',
                      type: 'boolean',
                      required: true
                    },
                    {
                      name: 'loanId',
                      label: 'Loan ID',
                      type: 'string',
                      required: true,
                      pattern: '^LOAN-\\d{4}-\\d{4}$',
                      patternError: 'Must be in format LOAN-YYYY-NNNN'
                    },
                    {
                      name: 'interestRate',
                      label: 'Final Interest Rate (%)',
                      type: 'number',
                      required: true,
                      min: 0,
                      max: 30,
                      step: 0.25
                    },
                    {
                      name: 'reason',
                      label: 'Decision Reason',
                      type: 'text',
                      required: true,
                      multiline: true
                    },
                    {
                      name: 'notes',
                      label: 'Additional Notes',
                      type: 'text',
                      multiline: true
                    }
                  ]
                }
              },
              timeout: 172800000 // 48 hours for human task
            }
          ],
          inputSchema: {
            type: 'object',
            properties: {
              applicantName: { type: 'string' },
              ssn: { type: 'string' },
              income: { type: 'number' },
              loanAmount: { type: 'number' },
              loanTerm: { type: 'number' }
            },
            required: [
              'applicantName',
              'ssn',
              'income',
              'loanAmount',
              'loanTerm'
            ]
          },
          outputSchema: {
            type: 'object',
            properties: {
              approved: { type: 'boolean' },
              loanId: { type: 'string' },
              interestRate: { type: 'number' },
              reason: { type: 'string' }
            },
            required: ['approved', 'loanId', 'interestRate', 'reason']
          }
        }
      }
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow definition by id' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  @ApiResponse({
    status: 200,
    description: 'The workflow definition has been found',
    type: WorkflowDefinition,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow definition not found',
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
    type: WorkflowDefinition,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow definition not found',
  })
  @ApiBody({
    description: 'Workflow definition update payload',
    examples: {
      updateSteps: {
        summary: 'Update workflow steps',
        value: {
          steps: [
            {
              id: 'send-email',
              name: 'Send Email Notification',
              type: 'TASK',
              dependencies: [],
              config: {
                handler: 'newEmailHandler',
                inputMapping: {
                  to: '$.input.email',
                  template: '$.input.templateId',
                },
                outputMapping: {
                  sent: '$.output.success',
                },
              },
            },
          ],
        },
      },
      updateDescription: {
        summary: 'Update workflow description',
        value: {
          description: 'Updated workflow description with new functionality',
        },
      },
    },
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
    description: 'The workflow definition has been deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow definition not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.workflowService.remove(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a workflow definition' })
  @ApiResponse({
    status: 201,
    description: 'The workflow instance has been created successfully.',
    type: WorkflowInstance,
  })
  async executeWorkflow(
    @Param('id') id: string,
    @Body() startWorkflowDto: StartWorkflowDto,
  ): Promise<WorkflowInstance> {
    return this.workflowExecutionService.startWorkflow(
      id,
      startWorkflowDto.businessId,
      startWorkflowDto.input,
    );
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get workflow instance status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the workflow instance details',
    type: WorkflowInstance,
  })
  async getWorkflowInstance(
    @Param('id') id: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.workflowService.findInstanceById(id);
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }
    return instance;
  }

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

  @Post(':instanceId/resume')
  @ApiOperation({ summary: 'Resume a paused workflow' })
  @ApiParam({ name: 'instanceId', description: 'Workflow instance ID' })
  @ApiResponse({
    status: 200,
    description: 'The workflow has been resumed',
    type: WorkflowInstance,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow instance not found',
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
    type: WorkflowInstance,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow instance not found',
  })
  cancelWorkflow(@Param('instanceId') instanceId: string) {
    return this.workflowExecutionService.cancelWorkflow(instanceId);
  }
}
