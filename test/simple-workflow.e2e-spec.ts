import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateWorkflowDefinitionDto } from '../src/workflow/dto/create-workflow-definition.dto';
import { StartWorkflowDto } from '../src/workflow/dto/start-workflow.dto';
import { WorkflowStatus } from '../src/workflow/enums/workflow-status.enum';
import { StepType } from '../src/workflow/enums/step-type.enum';

describe('Workflow E2E Test', () => {
  let app: INestApplication;
  let workflowId: string;
  let workflowInstanceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a workflow definition', async () => {
    const createWorkflowDto: CreateWorkflowDefinitionDto = {
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
          id: 'step-1',
          key: 'initial-review',
          name: 'Initial Review',
          type: StepType.TASK,
          dependencies: [],
          config: {
            type: 'human',
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
    };

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send(createWorkflowDto)
      .expect(201);

    console.log('Create workflow definition response:', response.body);
    workflowId = response.body.id;
    expect(response.body.name).toBe(createWorkflowDto.name);
    expect(response.body.steps).toHaveLength(1);
  });

  // Modify the start workflow test to wait longer and add more logging
  it('should start a workflow instance', async () => {
    const startWorkflowDto: StartWorkflowDto = {
      workflowDefinitionId: workflowId,
      businessId: 'TEST-001',
      input: {
        requestId: 'REQ-001',
        amount: 1000,
      },
    };

    const response = await request(app.getHttpServer())
      .post('/workflows/start')
      .send(startWorkflowDto)
      .expect(201);

    console.log('Start workflow response:', response.body);
    workflowInstanceId = response.body.id;

    // Since the start response already contains the instance status, we can use it directly
    expect(response.body.status).toBe(WorkflowStatus.RUNNING);
    expect(response.body.input).toEqual(startWorkflowDto.input);
  });

  it('should complete a human task', async () => {
    const completeTaskOutput = {
      approved: true,
      comments: 'Looks good!',
    };

    const completeResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowInstanceId}/steps/initial-review/complete`)
      .send(completeTaskOutput)
      .expect(201);

    console.log('Complete task response:', completeResponse.body);

    // Since the complete response contains the updated instance, we can use it directly
    expect(completeResponse.body.status).toBe(WorkflowStatus.COMPLETED);
    expect(completeResponse.body.output).toEqual(completeTaskOutput);
  });

  it('should handle workflow rejection', async () => {
    // Start a new workflow instance
    const startWorkflowDto = {
      workflowDefinitionId: workflowId,
      businessId: 'TEST-002',
      input: {
        requestId: 'REQ-002',
        amount: 2000,
      },
    };

    const startResponse = await request(app.getHttpServer())
      .post('/workflows/start')
      .send(startWorkflowDto)
      .expect(201);

    const newInstanceId = startResponse.body.id;

    // Complete the human task with rejection
    const rejectTaskOutput = {
      approved: false,
      comments: 'Amount too high',
    };

    const rejectResponse = await request(app.getHttpServer())
      .post(`/workflows/${newInstanceId}/steps/initial-review/complete`)
      .send(rejectTaskOutput)
      .expect(201);

    expect(rejectResponse.body.status).toBe(WorkflowStatus.COMPLETED);
    expect(rejectResponse.body.output).toEqual(rejectTaskOutput);
  });
});