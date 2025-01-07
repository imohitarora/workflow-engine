import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CreateWorkflowDefinitionDto } from '../src/workflow/dto/create-workflow-definition.dto';
import { StartWorkflowDto } from '../src/workflow/dto/start-workflow.dto';
import { StepType } from '../src/workflow/entities/workflow-definition.entity';
import { WorkflowStatus } from '../src/workflow/enums/workflow-status.enum';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from '../src/workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from '../src/workflow/entities/workflow-instance.entity';

describe('Workflow E2E Test', () => {
  let app: INestApplication;
  let workflowId: string;
  let workflowInstanceId: string;
  let taskId: string;

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
        entities: [WorkflowDefinition, WorkflowInstance],
        synchronize: true,
      }))
      .compile();

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
          id: 'step1',
          name: 'Initial Review',
          type: StepType.TASK,
          dependencies: [],
          config: {
            type: 'human',
            handler: 'approvalTask',
            inputMapping: {
              requestId: '$.input.requestId',
              amount: '$.input.amount'
            },
            outputMapping: {
              approved: '$.output.approved',
              comments: '$.output.comments'
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
    expect(response.body.steps).toHaveLength(1);
  });

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

    workflowInstanceId = response.body.id;

    // Wait for workflow to start running
    let runningInstance;
    for (let i = 0; i < 5; i++) {
      const instanceResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${workflowInstanceId}`)
        .expect(200);

      if (instanceResponse.body.status === WorkflowStatus.RUNNING) {
        runningInstance = instanceResponse.body;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    expect(runningInstance?.status).toBe(WorkflowStatus.RUNNING);
    expect(runningInstance?.input).toEqual(startWorkflowDto.input);
  });

  it('should list pending tasks', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks/pending')
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    const pendingTask = response.body.find(task => task.workflowInstanceId.includes(workflowInstanceId));
    expect(pendingTask).toBeDefined();
    taskId = pendingTask.id;
    expect(taskId).toBeDefined();
  });

  it('should complete a task', async () => {
    const completeTaskDto = {
      formData: {
        approved: true,
        comments: 'Looks good!',
      },
    };

    // Get pending tasks
    const tasksResponse = await request(app.getHttpServer())
      .get('/tasks/pending')
      .expect(200);

    expect(tasksResponse.body.length).toBeGreaterThan(0);
    const pendingTask = tasksResponse.body.find(task => task.workflowInstanceId.includes(workflowInstanceId));
    expect(pendingTask).toBeDefined();
    taskId = pendingTask.id;
    expect(taskId).toContain(workflowInstanceId);

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send(completeTaskDto)
      .expect(200);

    // Wait for workflow to complete
    let completedInstance;
    for (let i = 0; i < 5; i++) {
      const instanceResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${workflowInstanceId}`)
        .expect(200);

      if (instanceResponse.body.status === WorkflowStatus.COMPLETED) {
        completedInstance = instanceResponse.body;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    expect(completedInstance?.status).toBe(WorkflowStatus.COMPLETED);
  });

  it('should verify workflow completion', async () => {
    const response = await request(app.getHttpServer())
      .get(`/workflows/instances/${workflowInstanceId}`)
      .expect(200);

    expect(response.body.status).toBe(WorkflowStatus.COMPLETED);
    expect(response.body.output).toEqual({
      approved: true,
      comments: 'Looks good!',
    });
  });

  it('should handle workflow rejection', async () => {
    const startWorkflowDto = {
      workflowDefinitionId: workflowId,
      businessId: 'test-business-2',
      input: {
        requestId: 'REQ-002',
        amount: 2000,
      },
    };

    const startResponse = await request(app.getHttpServer())
      .post('/workflows/start')
      .send(startWorkflowDto)
      .expect(201);

    // Wait for workflow to start running
    let runningInstance;
    for (let i = 0; i < 5; i++) {
      const instanceResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${startResponse.body.id}`)
        .expect(200);

      if (instanceResponse.body.status === WorkflowStatus.RUNNING) {
        runningInstance = instanceResponse.body;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    expect(runningInstance?.status).toBe(WorkflowStatus.RUNNING);

    // Get the task ID
    const tasksResponse = await request(app.getHttpServer())
      .get('/tasks/pending')
      .expect(200);

    expect(tasksResponse.body.length).toBeGreaterThan(0);
    const pendingTask = tasksResponse.body.find(task => task.workflowInstanceId.includes(startResponse.body.id));
    expect(pendingTask).toBeDefined();
    const newTaskId = pendingTask.id;
    expect(newTaskId).toContain(startResponse.body.id);

    const rejectTaskDto = {
      formData: {
        approved: false,
        comments: 'Amount too high',
      },
    };

    await request(app.getHttpServer())
      .post(`/tasks/${newTaskId}/reject`)
      .send(rejectTaskDto)
      .expect(200);

    // Verify workflow is rejected
    const finalResponse = await request(app.getHttpServer())
      .get(`/workflows/instances/${startResponse.body.id}`)
      .expect(200);

    expect(finalResponse.body.status).toBe(WorkflowStatus.FAILED);
  });
});
