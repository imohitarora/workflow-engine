import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateWorkflowDefinitionDto } from '../src/workflow/dto/create-workflow-definition.dto';
import { StartWorkflowDto } from '../src/workflow/dto/start-workflow.dto';
import { StepType, WorkflowDefinition } from '../src/workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from '../src/workflow/entities/workflow-instance.entity';
import { WorkflowStatus } from '../src/workflow/enums/workflow-status.enum';

describe('Comprehensive Loan Approval Workflow E2E Test', () => {
    let app: INestApplication;
    let workflowId: string;
    let workflowInstanceId: string;
    let initialReviewTaskId: string;
    let creditCheckTaskId: string;
    let riskAssessmentTaskId: string;
    let finalApprovalTaskId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideModule(TypeOrmModule)
            .useModule(TypeOrmModule.forRoot({
                type: 'postgres',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: 'postgres',
                database: 'workflow_engine_test',
                schema: 'public',
                autoLoadEntities: true,
                synchronize: true,
            }))
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should create a comprehensive loan approval workflow definition', async () => {
        const createWorkflowDto: CreateWorkflowDefinitionDto = {
            name: 'Comprehensive Loan Approval Workflow',
            description: 'Multi-step loan approval process with credit check and risk assessment',
            inputSchema: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' },
                    applicantName: { type: 'string' },
                    loanAmount: { type: 'number' },
                    creditScore: { type: 'number' },
                    employmentStatus: { type: 'string' },
                    annualIncome: { type: 'number' },
                },
                required: ['applicationId', 'applicantName', 'loanAmount', 'creditScore', 'employmentStatus', 'annualIncome'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    approved: { type: 'boolean' },
                    interestRate: { type: 'number' },
                    loanTerm: { type: 'number' },
                    comments: { type: 'string' },
                    riskLevel: { type: 'string' },
                },
            },
            steps: [
                {
                    id: 'initial-review',
                    name: 'Initial Loan Review',
                    type: StepType.TASK,
                    dependencies: [],
                    config: {
                        type: 'human',
                        handler: 'initialReviewTask',
                        inputMapping: {
                            applicationId: '$.input.applicationId',
                            applicantName: '$.input.applicantName',
                            loanAmount: '$.input.loanAmount',
                            employmentStatus: '$.input.employmentStatus',
                            annualIncome: '$.input.annualIncome',
                        },
                        outputMapping: {
                            initialApproval: '$.output.initialApproval',
                            comments: '$.output.comments',
                        }
                    },
                },
                {
                    id: 'credit-check',
                    name: 'Credit Check',
                    type: StepType.TASK,
                    dependencies: ['initial-review'],
                    config: {
                        type: 'automated',
                        handler: 'creditCheckTask',
                        inputMapping: {
                            applicationId: '$.input.applicationId',
                            creditScore: '$.input.creditScore',
                        },
                        outputMapping: {
                            creditApproval: '$.output.creditApproval',
                            suggestedInterestRate: '$.output.suggestedInterestRate',
                        }
                    },
                },
                {
                    id: 'risk-assessment',
                    name: 'Risk Assessment',
                    type: StepType.TASK,
                    dependencies: ['credit-check'],
                    config: {
                        type: 'human',
                        handler: 'riskAssessmentTask',
                        inputMapping: {
                            applicationId: '$.input.applicationId',
                            loanAmount: '$.input.loanAmount',
                            creditScore: '$.input.creditScore',
                            employmentStatus: '$.input.employmentStatus',
                            annualIncome: '$.input.annualIncome',
                            creditApproval: '$.steps.credit-check.output.creditApproval',
                            suggestedInterestRate: '$.steps.credit-check.output.suggestedInterestRate',
                        },
                        outputMapping: {
                            riskLevel: '$.output.riskLevel',
                            adjustedInterestRate: '$.output.adjustedInterestRate',
                            recommendedLoanTerm: '$.output.recommendedLoanTerm',
                        }
                    },
                },
                {
                    id: 'final-approval',
                    name: 'Final Loan Approval',
                    type: StepType.TASK,
                    dependencies: ['risk-assessment'],
                    config: {
                        type: 'human',
                        handler: 'finalApprovalTask',
                        inputMapping: {
                            applicationId: '$.input.applicationId',
                            applicantName: '$.input.applicantName',
                            loanAmount: '$.input.loanAmount',
                            initialApproval: '$.steps.initial-review.output.initialApproval',
                            creditApproval: '$.steps.credit-check.output.creditApproval',
                            riskLevel: '$.steps.risk-assessment.output.riskLevel',
                            adjustedInterestRate: '$.steps.risk-assessment.output.adjustedInterestRate',
                            recommendedLoanTerm: '$.steps.risk-assessment.output.recommendedLoanTerm',
                        },
                        outputMapping: {
                            approved: '$.output.approved',
                            interestRate: '$.output.interestRate',
                            loanTerm: '$.output.loanTerm',
                            comments: '$.output.comments',
                        }
                    },
                },
            ],
        };

        const response = await request(app.getHttpServer())
            .post('/workflows')
            .send(createWorkflowDto)
            .expect(201);

        workflowId = response.body.id;
        expect(response.body.name).toBe(createWorkflowDto.name);
        expect(response.body.steps).toHaveLength(4);
    });

    it('should start a comprehensive loan workflow instance', async () => {
        const startWorkflowDto: StartWorkflowDto = {
            workflowDefinitionId: workflowId,
            businessId: 'LOAN-2023-001',
            input: {
                applicationId: 'LA-001',
                applicantName: 'John Doe',
                loanAmount: 100000,
                creditScore: 750,
                employmentStatus: 'Employed',
                annualIncome: 80000,
            },
        };

        const response = await request(app.getHttpServer())
            .post('/workflows/start')
            .send(startWorkflowDto)
            .expect(201);

        workflowInstanceId = response.body.id;
        expect(response.body.status).toBe(WorkflowStatus.RUNNING);
    });

    it('should complete initial loan review', async () => {

        const response = await request(app.getHttpServer())
            .get('/tasks/pending')
            .expect(200);

        expect(response.body.length).toBeGreaterThan(0);
        const pendingTask = response.body.find(task => task.workflowInstanceId.includes(workflowInstanceId));
        expect(pendingTask).toBeDefined();
        expect(pendingTask?.workflowInstanceId).toBe(workflowInstanceId);

        initialReviewTaskId = pendingTask?.id;

        const completeTaskDto = {
            output: {
                initialApproval: true,
                comments: 'Application looks promising, proceed with further checks',
            }
        };

        await request(app.getHttpServer())
            .post(`/tasks/${initialReviewTaskId}/complete`)
            .send(completeTaskDto)
            .expect(200);
    });

    it('should complete credit check', async () => {
        const tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${workflowInstanceId}/tasks`)
            .expect(200);

        creditCheckTaskId = tasksResponse.body[0].id;

        const completeTaskDto = {
            output: {
                creditApproval: true,
                suggestedInterestRate: 5.5,
            }
        };

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${creditCheckTaskId}/complete`)
            .send(completeTaskDto)
            .expect(200);
    });

    it('should complete risk assessment', async () => {
        const tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${workflowInstanceId}/tasks`)
            .expect(200);

        riskAssessmentTaskId = tasksResponse.body[0].id;

        const completeTaskDto = {
            output: {
                riskLevel: 'Low',
                adjustedInterestRate: 5.75,
                recommendedLoanTerm: 240,
            }
        };

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${riskAssessmentTaskId}/complete`)
            .send(completeTaskDto)
            .expect(200);
    });

    it('should complete final loan approval', async () => {
        const tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${workflowInstanceId}/tasks`)
            .expect(200);

        finalApprovalTaskId = tasksResponse.body[0].id;

        const completeTaskDto = {
            output: {
                approved: true,
                interestRate: 5.75,
                loanTerm: 240,
                comments: 'Loan approved based on favorable assessments',
            }
        };

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${finalApprovalTaskId}/complete`)
            .send(completeTaskDto)
            .expect(200);
    });

    it('should verify comprehensive loan workflow completion', async () => {
        const response = await request(app.getHttpServer())
            .get(`/workflows/instances/${workflowInstanceId}`)
            .expect(200);

        expect(response.body.status).toBe(WorkflowStatus.COMPLETED);
        expect(response.body.output).toEqual({
            approved: true,
            interestRate: 5.75,
            loanTerm: 240,
            comments: 'Loan approved based on favorable assessments',
            riskLevel: 'Low',
        });
    });

    it('should handle loan rejection scenario', async () => {
        // Start a new workflow instance with poor credit score
        const startWorkflowDto: StartWorkflowDto = {
            workflowDefinitionId: workflowId,
            businessId: 'LOAN-2023-002',
            input: {
                applicationId: 'LA-002',
                applicantName: 'Jane Smith',
                loanAmount: 200000,
                creditScore: 550,
                employmentStatus: 'Self-employed',
                annualIncome: 60000,
            },
        };

        const startResponse = await request(app.getHttpServer())
            .post('/workflows/start')
            .send(startWorkflowDto)
            .expect(201);

        const rejectedWorkflowInstanceId = startResponse.body.id;

        // Complete initial review
        let tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${rejectedWorkflowInstanceId}/tasks`)
            .expect(200);

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${tasksResponse.body[0].id}/complete`)
            .send({
                output: {
                    initialApproval: true,
                    comments: 'Proceed with caution due to high loan amount',
                }
            })
            .expect(200);

        // Complete credit check
        tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${rejectedWorkflowInstanceId}/tasks`)
            .expect(200);

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${tasksResponse.body[0].id}/complete`)
            .send({
                output: {
                    creditApproval: false,
                    suggestedInterestRate: 10.5,
                }
            })
            .expect(200);

        // Complete risk assessment
        tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${rejectedWorkflowInstanceId}/tasks`)
            .expect(200);

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${tasksResponse.body[0].id}/complete`)
            .send({
                output: {
                    riskLevel: 'High',
                    adjustedInterestRate: 11.0,
                    recommendedLoanTerm: 180,
                }
            })
            .expect(200);

        // Complete final approval (rejection)
        tasksResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${rejectedWorkflowInstanceId}/tasks`)
            .expect(200);

        await request(app.getHttpServer())
            .post(`/workflows/tasks/${tasksResponse.body[0].id}/complete`)
            .send({
                output: {
                    approved: false,
                    interestRate: null,
                    loanTerm: null,
                    comments: 'Loan rejected due to poor credit score and high risk',
                }
            })
            .expect(200);

        // Verify rejection
        const rejectionResponse = await request(app.getHttpServer())
            .get(`/workflows/instances/${rejectedWorkflowInstanceId}`)
            .expect(200);

        expect(rejectionResponse.body.status).toBe(WorkflowStatus.COMPLETED);
        expect(rejectionResponse.body.output).toEqual({
            approved: false,
            interestRate: null,
            loanTerm: null,
            comments: 'Loan rejected due to poor credit score and high risk',
            riskLevel: 'High',
        });
    });
});