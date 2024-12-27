import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowService } from './workflow.service';
import {
  WorkflowInstance,
  WorkflowStatus,
} from './entities/workflow-instance.entity';
import { WorkflowDefinition } from './entities/workflow-definition.entity';

describe('WorkflowExecutionService', () => {
  let service: WorkflowExecutionService;
  let mockRepository: Partial<Repository<WorkflowInstance>>;
  let mockWorkflowService: Partial<WorkflowService>;

  // Mock data setup
  const mockWorkflowDefinition: WorkflowDefinition = {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    description: 'Test workflow description',
    steps: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    inputSchema: {},
    outputSchema: {},
    isActive: true,
  };

  const mockWorkflowInstance: WorkflowInstance = {
    id: 'instance-1',
    workflowDefinitionId: 'test-workflow-1',
    workflowDefinition: mockWorkflowDefinition,
    input: { testData: 'value' },
    state: {
      currentSteps: [],
      completedSteps: [],
      variables: { testData: 'value' },
    },
    output: {},
    status: WorkflowStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockReturnValue(mockWorkflowInstance),
      save: jest.fn().mockResolvedValue(mockWorkflowInstance),
      findOne: jest.fn().mockResolvedValue(mockWorkflowInstance),
    };

    mockWorkflowService = {
      findOne: jest.fn().mockResolvedValue(mockWorkflowDefinition),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowExecutionService,
        {
          provide: getRepositoryToken(WorkflowInstance),
          useValue: mockRepository,
        },
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    service = module.get<WorkflowExecutionService>(WorkflowExecutionService);
  });

  describe('startWorkflow', () => {
    const input = { testData: 'value' };
    const workflowDefinitionId = 'test-workflow-1';

    it('should create and save a new workflow instance', async () => {
      const result = await service.startWorkflow(workflowDefinitionId, input);

      expect(mockWorkflowService.findOne).toHaveBeenCalledWith(
        workflowDefinitionId,
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        workflowDefinitionId,
        workflowDefinition: mockWorkflowDefinition,
        input,
        state: {
          currentSteps: [],
          completedSteps: [],
          variables: input,
        },
        output: {},
        status: WorkflowStatus.PENDING,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockWorkflowInstance);
    });

    it('should throw error if workflow definition not found', async () => {
      mockWorkflowService.findOne = jest
        .fn()
        .mockRejectedValue(new Error('Not found'));

      await expect(
        service.startWorkflow(workflowDefinitionId, input),
      ).rejects.toThrow('Not found');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const instanceId = 'instance-1';
      await service.executeWorkflow(instanceId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: instanceId },
        relations: ['workflowDefinition'],
      });
    });

    it('should throw error if instance not found', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.executeWorkflow('non-existent')).rejects.toThrow(
        `Workflow instance non-existent not found`,
      );
    });
  });
});
