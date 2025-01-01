import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';

export enum WorkflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowDefinitionId: string;

  @ManyToOne(() => WorkflowDefinition)
  @JoinColumn({ name: 'workflowDefinitionId' })
  workflowDefinition: WorkflowDefinition;

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

export interface WorkflowState {
  currentSteps: StepState[];
  completedSteps: StepState[];
  variables: Record<string, any>;
}

export interface StepState {
  stepId: string;
  status: StepStatus;
  startTime: Date;
  endTime?: Date;
  attempts: number;
  error?: string;
  output?: any;
}

export enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}
