import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StepType {
  TASK = 'TASK',
  DECISION = 'DECISION',
  PARALLEL = 'PARALLEL',
}

export type TaskType = 'script' | 'http' | 'human';

export interface StepConfig {
  type: TaskType;
  handler: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export interface Condition {
  expression: string;
  type: 'javascript' | 'jsonpath';
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  dependencies: string[];
  config: StepConfig;
  retryConfig?: RetryConfig;
  timeout?: number;
  condition?: Condition;
}

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb')
  steps: WorkflowStep[];

  @Column('jsonb')
  inputSchema: Record<string, any>;

  @Column('jsonb')
  outputSchema: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
