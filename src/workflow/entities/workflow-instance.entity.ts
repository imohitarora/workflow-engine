import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { StepStatus } from '../enums/step-status.enum';

interface StepBase {
  stepId: string;
  name: string;
  type: string;
  status: StepStatus;
  startTime: Date;
  error?: string;
  dependencies: string[];
  attempts: number;
}

interface CurrentStep extends StepBase {
  endTime?: Date;
  output?: any;
  config?: {
    type: string;
    [key: string]: any;
  };
}

interface CompletedStep extends StepBase {
  endTime: Date;
  output: any;
}

interface WorkflowState {
  currentSteps: CurrentStep[];
  completedSteps: CompletedStep[];
  variables: Record<string, any>;
}

@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessId: string;

  @ManyToOne(() => WorkflowDefinition)
  @JoinColumn({ name: 'workflowDefinitionId' })
  workflowDefinition: WorkflowDefinition;

  @Column()
  workflowDefinitionId: string;

  @Column('jsonb')
  input: Record<string, any>;

  @Column('jsonb')
  output: Record<string, any>;

  @Column('jsonb')
  state: WorkflowState;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.PENDING,
  })
  status: WorkflowStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
