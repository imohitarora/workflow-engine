import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { WorkflowStatus } from '../src/workflow/entities/workflow-instance.entity';
import { TestDatabaseModule } from './test-database.module';

describe('Maker-Checker Workflow Execution (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule, AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 10000); // Increased timeout

  afterAll(async () => {
    if (app) {
      await app.close();
      // Add a small delay to ensure all connections are closed
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  it('should process a maker-checker workflow with approval', async () => {
    // 1. Create a maker-checker workflow definition
    const workflowDefinition = {
      name: 'Payment Approval Workflow',
      description: 'Two-step approval process for high-value payments',
      inputSchema: {
        type: 'object',
        properties: {
          transactionId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          beneficiary: { type: 'string' },
          accountNumber: { type: 'string' },
          initiator: { type: 'string' },
          approver: { type: 'string' }
        },
        required: ['transactionId', 'amount', 'currency', 'beneficiary', 'accountNumber', 'initiator', 'approver']
      },
      outputSchema: {
        type: 'object',
        properties: {
          approved: { type: 'boolean' },
          status: { type: 'string' },
          approvalDate: { type: 'string' },
          comments: { type: 'string' }
        }
      },
      steps: [
        {
          id: 'validate-request',
          name: 'Validate Payment Request',
          type: 'TASK',
          dependencies: [],
          config: {
            type: 'script',
            script: `
              const { amount, currency, initiator, approver } = context;
              const validations = [];
              
              // Basic validation rules
              if (amount <= 0) {
                validations.push('Amount must be greater than 0');
              }
              if (initiator === approver) {
                validations.push('Initiator and approver cannot be the same person');
              }
              if (!['USD', 'EUR', 'GBP'].includes(currency)) {
                validations.push('Currency must be USD, EUR, or GBP');
              }
              
              // Check amount thresholds
              const requiresApproval = amount > 10000;
              
              return {
                isValid: validations.length === 0,
                validationErrors: validations,
                requiresApproval,
                timestamp: new Date().toISOString()
              };
            `
          }
        },
        {
          id: 'check-approval-requirement',
          name: 'Check if Approval Required',
          type: 'DECISION',
          dependencies: ['validate-request'],
          condition: {
            type: 'javascript',
            expression: 'context["validate-request"].output.requiresApproval'
          }
        },
        {
          id: 'auto-approve',
          name: 'Auto-Approve Small Payment',
          type: 'TASK',
          dependencies: ['check-approval-requirement'],
          config: {
            type: 'script',
            script: `
              const validationResult = context['validate-request'].output;
              
              if (!validationResult.isValid) {
                return {
                  approved: false,
                  status: 'REJECTED',
                  approvalDate: new Date().toISOString(),
                  comments: 'Validation failed: ' + validationResult.validationErrors.join(', ')
                };
              }
              
              return {
                approved: true,
                status: 'AUTO_APPROVED',
                approvalDate: new Date().toISOString(),
                comments: 'Auto-approved: Amount below threshold'
              };
            `
          }
        },
        {
          id: 'checker-approval',
          name: 'Get Checker Approval',
          type: 'TASK',
          dependencies: ['check-approval-requirement'],
          config: {
            type: 'script',
            script: `
              const { amount, currency, approver } = context;
              const validationResult = context['validate-request'].output;
              
              if (!validationResult.isValid) {
                return {
                  approved: false,
                  status: 'REJECTED',
                  approvalDate: new Date().toISOString(),
                  comments: 'Validation failed: ' + validationResult.validationErrors.join(', ')
                };
              }
              
              // Simulate checker approval (in real system, this would be a human task)
              const approved = amount <= 50000; // Auto-approve for test if amount <= 50000
              
              return {
                approved,
                status: approved ? 'APPROVED' : 'REJECTED',
                approvalDate: new Date().toISOString(),
                comments: approved 
                  ? 'Approved by ' + approver 
                  : 'Rejected: Amount exceeds auto-approval limit'
              };
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

    // 2. Test case 1: Small payment (auto-approval)
    const smallPaymentInput = {
      input: {
        transactionId: 'TXN001',
        amount: 5000,
        currency: 'USD',
        beneficiary: 'John Doe',
        accountNumber: '1234567890',
        initiator: 'maker1',
        approver: 'checker1'
      }
    };

    const smallPaymentResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/execute`)
      .send(smallPaymentInput)
      .expect(201);

    let instanceId = smallPaymentResponse.body.id;
    let status = WorkflowStatus.RUNNING;
    let attempts = 0;
    const maxAttempts = 10;
    let finalResponse;

    // Poll for completion
    while (status === WorkflowStatus.RUNNING && attempts < maxAttempts) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${instanceId}`)
        .expect(200);

      status = statusResponse.body.status;
      finalResponse = statusResponse;
      
      if (status === WorkflowStatus.RUNNING) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // Verify small payment workflow
    expect(status).toBe(WorkflowStatus.COMPLETED);
    const smallPaymentInstance = finalResponse.body;
    
    // Verify validation step
    const validationStep = smallPaymentInstance.state.completedSteps.find(s => s.stepId === 'validate-request');
    expect(validationStep.output.isValid).toBe(true);
    expect(validationStep.output.requiresApproval).toBe(false);
    
    // Verify auto-approval
    const autoApproveStep = smallPaymentInstance.state.completedSteps.find(s => s.stepId === 'auto-approve');
    expect(autoApproveStep.output.approved).toBe(true);
    expect(autoApproveStep.output.status).toBe('AUTO_APPROVED');

    // 3. Test case 2: Large payment (requires checker approval)
    const largePaymentInput = {
      input: {
        transactionId: 'TXN002',
        amount: 25000,
        currency: 'USD',
        beneficiary: 'Jane Smith',
        accountNumber: '0987654321',
        initiator: 'maker2',
        approver: 'checker2'
      }
    };

    const largePaymentResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/execute`)
      .send(largePaymentInput)
      .expect(201);

    instanceId = largePaymentResponse.body.id;
    status = WorkflowStatus.RUNNING;
    attempts = 0;
    let largePaymentFinalResponse;

    // Poll for completion
    while (status === WorkflowStatus.RUNNING && attempts < maxAttempts) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${instanceId}`)
        .expect(200);

      status = statusResponse.body.status;
      largePaymentFinalResponse = statusResponse;
      
      if (status === WorkflowStatus.RUNNING) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // Verify large payment workflow
    const largePaymentInstance = largePaymentFinalResponse.body;
    
    // Verify validation step
    const largeValidationStep = largePaymentInstance.state.completedSteps.find(s => s.stepId === 'validate-request');
    expect(largeValidationStep.output.isValid).toBe(true);
    expect(largeValidationStep.output.requiresApproval).toBe(true);
    
    // Verify checker approval
    const checkerStep = largePaymentInstance.state.completedSteps.find(s => s.stepId === 'checker-approval');
    expect(checkerStep.output.approved).toBe(true);
    expect(checkerStep.output.status).toBe('APPROVED');
    
    // 4. Test case 3: Invalid request (same initiator and approver)
    const invalidInput = {
      input: {
        transactionId: 'TXN003',
        amount: 15000,
        currency: 'USD',
        beneficiary: 'Invalid Test',
        accountNumber: '1122334455',
        initiator: 'user1',
        approver: 'user1' // Same as initiator
      }
    };

    const invalidResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/execute`)
      .send(invalidInput)
      .expect(201);

    instanceId = invalidResponse.body.id;
    status = WorkflowStatus.RUNNING;
    attempts = 0;
    let invalidFinalResponse;

    // Poll for completion
    while (status === WorkflowStatus.RUNNING && attempts < maxAttempts) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${instanceId}`)
        .expect(200);

      status = statusResponse.body.status;
      invalidFinalResponse = statusResponse;
      
      if (status === WorkflowStatus.RUNNING) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // Verify invalid request workflow
    const invalidInstance = invalidFinalResponse.body;
    
    // Verify validation failure
    const invalidValidationStep = invalidInstance.state.completedSteps.find(s => s.stepId === 'validate-request');
    expect(invalidValidationStep.output.isValid).toBe(false);
    expect(invalidValidationStep.output.validationErrors).toContain('Initiator and approver cannot be the same person');
  });
});
