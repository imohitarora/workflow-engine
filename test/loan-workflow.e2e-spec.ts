import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { WorkflowStatus } from '../src/workflow/entities/workflow-instance.entity';
import { TestDatabaseModule } from './test-database.module';

describe('Loan Workflow Execution (e2e)', () => {
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
      // Use unref() to allow the process to exit if this is the only remaining handle
      const cleanup = setTimeout(() => {}, 1000);
      cleanup.unref();
      // Wait for connections to close
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1000);
        timer.unref();
      });
    }
  });

  it('should process a loan application successfully', async () => {
    // 1. Create a loan processing workflow definition
    const workflowDefinition = {
      name: 'Loan Processing Workflow',
      description: 'End-to-end loan application processing workflow',
      inputSchema: {
        type: 'object',
        properties: {
          applicantName: { type: 'string' },
          email: { type: 'string' },
          income: { type: 'number' },
          loanAmount: { type: 'number' },
          loanTerm: { type: 'number' }, // in months
          creditScore: { type: 'number' },
        },
        required: [
          'applicantName',
          'email',
          'income',
          'loanAmount',
          'loanTerm',
          'creditScore',
        ],
      },
      outputSchema: {
        type: 'object',
        properties: {
          approved: { type: 'boolean' },
          interestRate: { type: 'number' },
          monthlyPayment: { type: 'number' },
          reason: { type: 'string' },
        },
      },
      steps: [
        {
          id: 'validate-application',
          name: 'Validate Loan Application',
          type: 'TASK',
          dependencies: [],
          config: {
            type: 'script',
            script: `
              const { income, loanAmount, loanTerm } = context;
              const validations = [];
              
              if (loanAmount > income * 5) {
                validations.push('Loan amount exceeds 5x annual income');
              }
              if (loanTerm < 12 || loanTerm > 360) {
                validations.push('Loan term must be between 12 and 360 months');
              }
              if (loanAmount < 1000 || loanAmount > 1000000) {
                validations.push('Loan amount must be between $1,000 and $1,000,000');
              }
              
              return {
                isValid: validations.length === 0,
                validationErrors: validations
              };
            `,
          },
        },
        {
          id: 'check-eligibility',
          name: 'Check Loan Eligibility',
          type: 'TASK',
          dependencies: ['validate-application'],
          config: {
            type: 'script',
            script: `
              const { creditScore, income, loanAmount } = context;
              const validationResult = context['validate-application'].output;
              
              if (!validationResult.isValid) {
                return {
                  eligible: false,
                  reason: validationResult.validationErrors.join(', ')
                };
              }
              
              // Calculate monthly income and estimated monthly payment
              const monthlyIncome = income / 12;
              const estimatedMonthlyPayment = (loanAmount / 360) * 1.06; // Rough estimate with 6% interest
              const debtToIncome = (estimatedMonthlyPayment / monthlyIncome) * 100;
              
              let eligible = true;
              let reason = 'Approved';
              
              if (creditScore < 600) {
                eligible = false;
                reason = 'Credit score too low';
              } else if (debtToIncome > 43) {
                eligible = false;
                reason = 'Debt-to-income ratio too high';
              }
              
              return {
                eligible,
                reason,
                debtToIncome,
                estimatedMonthlyPayment
              };
            `,
          },
        },
        {
          id: 'calculate-terms',
          name: 'Calculate Loan Terms',
          type: 'TASK',
          dependencies: ['check-eligibility'],
          config: {
            type: 'script',
            script: `
              const { creditScore, loanAmount, loanTerm } = context;
              const eligibilityResult = context['check-eligibility'].output;
              
              if (!eligibilityResult.eligible) {
                return {
                  approved: false,
                  reason: eligibilityResult.reason
                };
              }
              
              // Base interest rate calculation
              let baseRate = 5.0; // Base rate of 5%
              
              // Adjust rate based on credit score
              if (creditScore >= 800) baseRate -= 1.5;
              else if (creditScore >= 750) baseRate -= 1.0;
              else if (creditScore >= 700) baseRate -= 0.5;
              else if (creditScore < 650) baseRate += 1.0;
              
              // Adjust rate based on loan term
              if (loanTerm > 180) baseRate += 0.5; // Higher rate for longer terms
              
              const annualRate = baseRate;
              const monthlyRate = annualRate / 12 / 100;
              
              // Calculate monthly payment using amortization formula
              const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / 
                                   (Math.pow(1 + monthlyRate, loanTerm) - 1);
              
              return {
                approved: true,
                interestRate: annualRate,
                monthlyPayment: Math.round(monthlyPayment * 100) / 100,
                reason: 'Loan approved'
              };
            `,
          },
        },
      ],
    };

    // Create workflow definition
    const createResponse = await request(app.getHttpServer())
      .post('/workflows')
      .send(workflowDefinition)
      .expect(201);

    const workflowId = createResponse.body.id;

    // 2. Test successful loan application
    const successfulLoanInput = {
      input: {
        applicantName: 'John Doe',
        email: 'john@example.com',
        income: 100000,
        loanAmount: 300000,
        loanTerm: 360,
        creditScore: 750,
      },
    };

    const startResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/execute`)
      .send(successfulLoanInput)
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // 4. Verify successful loan application
    expect(status).toBe(WorkflowStatus.COMPLETED);

    const workflowInstance = finalResponse.body;

    // Verify validation step
    const validationStep = workflowInstance.state.completedSteps.find(
      (s) => s.stepId === 'validate-application',
    );
    expect(validationStep.output.isValid).toBe(true);
    expect(validationStep.output.validationErrors).toHaveLength(0);

    // Verify eligibility step
    const eligibilityStep = workflowInstance.state.completedSteps.find(
      (s) => s.stepId === 'check-eligibility',
    );
    expect(eligibilityStep.output.eligible).toBe(true);
    expect(eligibilityStep.output.debtToIncome).toBeLessThan(43);

    // Verify final terms
    const termsStep = workflowInstance.state.completedSteps.find(
      (s) => s.stepId === 'calculate-terms',
    );
    expect(termsStep.output.approved).toBe(true);
    expect(termsStep.output.interestRate).toBe(4.5); // Base rate (5%) - 0.5% for credit score 750
    expect(termsStep.output.monthlyPayment).toBeGreaterThan(0);

    // 5. Test rejected loan application (low credit score)
    const rejectedLoanInput = {
      input: {
        applicantName: 'Jane Smith',
        email: 'jane@example.com',
        income: 100000,
        loanAmount: 300000,
        loanTerm: 360,
        creditScore: 550,
      },
    };

    const rejectedStartResponse = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/execute`)
      .send(rejectedLoanInput)
      .expect(201);

    const rejectedInstanceId = rejectedStartResponse.body.id;

    // Poll for completion
    status = WorkflowStatus.RUNNING;
    attempts = 0;
    let rejectedFinalResponse;

    while (status === WorkflowStatus.RUNNING && attempts < maxAttempts) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/workflows/instances/${rejectedInstanceId}`)
        .expect(200);

      status = statusResponse.body.status;
      rejectedFinalResponse = statusResponse;

      if (status === WorkflowStatus.RUNNING) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // Verify rejected loan application
    const rejectedInstance = rejectedFinalResponse.body;
    const rejectedEligibilityStep = rejectedInstance.state.completedSteps.find(
      (s) => s.stepId === 'check-eligibility',
    );
    expect(rejectedEligibilityStep.output.eligible).toBe(false);
    expect(rejectedEligibilityStep.output.reason).toBe('Credit score too low');
  });
});
