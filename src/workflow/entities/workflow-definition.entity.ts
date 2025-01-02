import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column('jsonb')
  steps: WorkflowStep[];

  @Column('jsonb')
  inputSchema: Record<string, any>;

  @Column('jsonb')
  outputSchema: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  dependencies: string[];
  config: StepConfig;
  retryConfig?: RetryConfig;
  timeout?: number; // in milliseconds
  condition?: StepCondition;
}

export interface StepConfig {
  type?: 'human' | 'script' | 'http';  // Type of task
  handler: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export interface StepCondition {
  expression: string;
  type: 'javascript' | 'jsonpath';
}

export enum StepType {
  TASK = 'TASK',
  DECISION = 'DECISION',
  PARALLEL = 'PARALLEL',
  SUB_WORKFLOW = 'SUB_WORKFLOW',
}
