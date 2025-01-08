import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateWorkflowDefinitionDto } from '../src/workflow/dto/create-workflow-definition.dto';
import { StartWorkflowDto } from '../src/workflow/dto/start-workflow.dto';
import { WorkflowStatus } from '../src/workflow/enums/workflow-status.enum';
import { StepType } from '../src/workflow/enums/step-type.enum';

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
      .useModule(
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'workflow_engine_test',
          schema: 'public',
          autoLoadEntities: true,
          synchronize: true,
        }),
      )
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
      description:
        'Multi-step loan approval process with credit check and risk assessment',
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
        required: [
          'applicationId',
          'applicantName',
          'loanAmount',
          'creditScore',
          'employmentStatus',
          'annualIncome',
        ],
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
          key: 'initial-review',
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
            },
          },
        },
        {
          id: 'credit-check',
          key: 'credit-check',
          name: 'Credit Check',
          type: StepType.TASK,
          dependencies: ['initial-review'],
          config: {
            type: 'script',
            script: `
              const creditScore = input.creditScore;
              return {
                creditApproval: creditScore >= 700,
                suggestedInterestRate: creditScore >= 750 ? 5.5 : 6.5
              };
            `,
            inputMapping: {
              applicationId: '$.input.applicationId',
              creditScore: '$.input.creditScore',
            },
            outputMapping: {
              creditApproval: '$.result.creditApproval',
              suggestedInterestRate: '$.result.suggestedInterestRate',
            },
          },
        },
        {
          id: 'risk-assessment',
          key: 'risk-assessment',
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
              suggestedInterestRate:
                '$.steps.credit-check.output.suggestedInterestRate',
            },
            outputMapping: {
              riskLevel: '$.riskLevel',
              adjustedInterestRate: '$.adjustedInterestRate',
              recommendedLoanTerm: '$.recommendedLoanTerm',
            },
          },
        },
        {
          id: 'final-approval',
          key: 'final-approval',
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
              adjustedInterestRate:
                '$.steps.risk-assessment.output.adjustedInterestRate',
              recommendedLoanTerm:
                '$.steps.risk-assessment.output.recommendedLoanTerm',
            },
            outputMapping: {
              approved: '$.approved',
              interestRate: '$.interestRate',
              loanTerm: '$.loanTerm',
              comments: '$.comments',
            },
          },
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send(createWorkflowDto)
      .expect(201);

    // console.log('Create workflow definition response:', response.body);
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
    expect(response.body.input).toEqual(startWorkflowDto.input);
  });

  // Update all API endpoints in loan-workflow.e2e-spec.ts
  it('should complete initial loan review', async () => {
    const completeTaskOutput = {
      initialApproval: true,
      comments: 'Application looks promising, proceed with further checks',
    };

    const response = await request(app.getHttpServer())
      .post(`/workflows/${workflowInstanceId}/steps/initial-review/complete`)
      .send(completeTaskOutput)
      .expect(201);

    expect(response.body.state.stepExecutions).toContainEqual(
      expect.objectContaining({
        stepId: 'initial-review',
        status: 'COMPLETED',
        output: completeTaskOutput,
      }),
    );
  });

  it('should complete credit check', async () => {
    // Since credit-check is a script task, we need to wait for it to complete automatically
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for automatic execution

    console.log('Waiting for credit check to complete...', workflowInstanceId);

    const response = await request(app.getHttpServer())
      .get(`/workflows/instances/${workflowInstanceId}`)
      .expect(200);

    expect(response.body.state.stepExecutions).toContainEqual(
      expect.objectContaining({
        stepId: 'credit-check',
        status: 'COMPLETED',
      }),
    );
  });

  it('should complete risk assessment', async () => {
    const completeTaskOutput = {
      riskLevel: 'LOW',
      adjustedInterestRate: 5.5,
      recommendedLoanTerm: 24,
    };

    console.log('Waiting for risk assessment to complete...', workflowInstanceId);

    const response = await request(app.getHttpServer())
      .post(`/workflows/${workflowInstanceId}/steps/risk-assessment/complete`)
      .send(completeTaskOutput)
      .expect(201);

    console.log('Complete risk assessment response:', response.body);
    expect(response.body.state.stepExecutions).toContainEqual(
      expect.objectContaining({
        stepId: 'risk-assessment',
        status: 'COMPLETED',
        output: completeTaskOutput,
      }),
    );
  });

  it('should complete final loan approval', async () => {
    const completeTaskOutput = {
      approved: true,
      interestRate: 5.5,
      loanTerm: 24,
      comments: 'Loan approved with standard terms',
    };

    const response = await request(app.getHttpServer())
      .post(`/workflows/${workflowInstanceId}/steps/final-approval/complete`)
      .send(completeTaskOutput)
      .expect(201);

    console.log('Complete final approval response:', response.body);
    expect(response.body.status).toBe('COMPLETED');
    expect(response.body.output).toEqual(
      expect.objectContaining({
        approved: true,
        interestRate: 5.5,
        loanTerm: 24,
      }),
    );
  });

  // it('should handle loan rejection scenario', async () => {
  //   const startWorkflowDto: StartWorkflowDto = {
  //     workflowDefinitionId: workflowId,
  //     businessId: 'LOAN-2023-002',
  //     input: {
  //       applicationId: 'LA-002',
  //       applicantName: 'Jane Smith',
  //       loanAmount: 200000,
  //       creditScore: 550,
  //       employmentStatus: 'Self-employed',
  //       annualIncome: 60000,
  //     },
  //   };

  //   const startResponse = await request(app.getHttpServer())
  //     .post('/workflows/start')
  //     .send(startWorkflowDto)
  //     .expect(201);

  //   const rejectedWorkflowInstanceId = startResponse.body.id;

  //   // Complete initial review
  //   await request(app.getHttpServer())
  //     .post(`/workflows/${rejectedWorkflowInstanceId}/steps/initial-review/complete`)
  //     .send({
  //       initialApproval: true,
  //       comments: 'Proceed with caution due to high loan amount',
  //     })
  //     .expect(201);

  //   // Complete credit check
  //   await request(app.getHttpServer())
  //     .post(`/workflows/${rejectedWorkflowInstanceId}/steps/credit-check/complete`)
  //     .send({
  //       creditApproval: false,
  //       suggestedInterestRate: 10.5,
  //     })
  //     .expect(201);

  //   // Complete risk assessment
  //   await request(app.getHttpServer())
  //     .post(`/workflows/${rejectedWorkflowInstanceId}/steps/risk-assessment/complete`)
  //     .send({
  //       riskLevel: 'High',
  //       adjustedInterestRate: 11.0,
  //       recommendedLoanTerm: 180,
  //     })
  //     .expect(201);

  //   // Complete final approval (rejection)
  //   const rejectResponse = await request(app.getHttpServer())
  //     .post(`/workflows/${rejectedWorkflowInstanceId}/steps/final-approval/complete`)
  //     .send({
  //       approved: false,
  //       interestRate: null,
  //       loanTerm: null,
  //       comments: 'Loan rejected due to poor credit score and high risk',
  //     })
  //     .expect(201);

  //   console.log('Complete rejection response:', rejectResponse.body);
  //   expect(rejectResponse.body.status).toBe(WorkflowStatus.COMPLETED);
  //   expect(rejectResponse.body.output).toEqual({
  //     approved: false,
  //     interestRate: null,
  //     loanTerm: null,
  //     comments: 'Loan rejected due to poor credit score and high risk',
  //     riskLevel: 'High',
  //   });
  // });
});
