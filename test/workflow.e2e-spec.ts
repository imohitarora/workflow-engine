import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { WorkflowStatus } from '../src/workflow/entities/workflow-instance.entity';
import { TestDatabaseModule } from './test-database.module';

describe('Workflow Execution (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule, AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should execute a complete workflow successfully', async () => {
    // 1. Create a workflow definition
    const workflowDefinition = {
      name: 'Test Workflow',
      description: 'A test workflow with multiple step types',
      inputSchema: {
        type: 'object',
        properties: {
          initialValue: { type: 'number' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          finalValue: { type: 'number' }
        }
      },
      steps: [
        {
          id: 'step1',
          name: 'Initial Script Step',
          type: 'TASK',
          dependencies: [],
          config: {
            type: 'script',
            script: 'return { value: context.initialValue * 2 };'
          }
        },
        {
          id: 'step2',
          name: 'Conditional Step',
          type: 'DECISION',
          dependencies: ['step1'],
          condition: {
            type: 'javascript',
            expression: 'context.step1.output.value > 5'
          }
        },
        {
          id: 'step3',
          name: 'Parallel Tasks',
          type: 'PARALLEL',
          dependencies: ['step2'],
          config: {
            tasks: [
              {
                id: 'parallel1',
                name: 'Parallel Task 1',
                type: 'TASK',
                config: {
                  type: 'script',
                  script: 'return { value: context.step1.output.value + 10 };'
                }
              },
              {
                id: 'parallel2',
                name: 'Parallel Task 2',
                type: 'TASK',
                config: {
                  type: 'script',
                  script: 'return { value: context.step1.output.value * 3 };'
                }
              }
            ],
            timeoutMs: 5000,
            failFast: true
          }
        },
        {
          id: 'step4',
          name: 'Final Task',
          type: 'TASK',
          dependencies: ['step3'],
          config: {
            type: 'script',
            script: `
              const parallel1Value = context.step3.output.results.find(r => r.taskId === 'parallel1').output.value;
              const parallel2Value = context.step3.output.results.find(r => r.taskId === 'parallel2').output.value;
              return { finalValue: parallel1Value + parallel2Value };
            `
          }
        }
      ]
    };

    // Create workflow definition
    const createResponse = await request(app.getHttpServer())
      .post('/workflows')
      .send(workflowDefinition)
      .expect(201);

    const workflowId = createResponse.body.id;

    // 2. Start workflow execution
    const startResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/execute`)
      .send({
        input: {
          initialValue: 5
        }
      })
      .expect(201);

    const instanceId = startResponse.body.id;

    // 3. Poll for workflow completion
    let status = WorkflowStatus.RUNNING;
    let attempts = 0;
    const maxAttempts = 10;
    let finalResponse;

    while (status === WorkflowStatus.RUNNING && attempts < maxAttempts) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${instanceId}`)
        .expect(200);

      status = statusResponse.body.status;
      finalResponse = statusResponse;
      
      if (status === WorkflowStatus.RUNNING) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
        attempts++;
      }
    }

    // 4. Verify workflow execution
    expect(status).toBe(WorkflowStatus.COMPLETED);
    
    const workflowInstance = finalResponse.body;
    
    // Verify step execution order
    const completedSteps = workflowInstance.state.completedSteps;
    expect(completedSteps).toHaveLength(4);
    
    // Verify step1 output
    const step1 = completedSteps.find(s => s.stepId === 'step1');
    expect(step1.output.value).toBe(10); // initialValue(5) * 2
    
    // Verify parallel execution results
    const step3 = completedSteps.find(s => s.stepId === 'step3');
    expect(step3.output.results).toHaveLength(2);
    expect(step3.output.successCount).toBe(2);
    
    // Verify final output
    expect(workflowInstance.output.finalValue).toBe(50); // (10 + 20) + (10 * 3) = 30 + 20 = 50
  });
});
