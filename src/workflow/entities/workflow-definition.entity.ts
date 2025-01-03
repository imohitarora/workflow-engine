import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
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
  form?: {
    title: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      multiline?: boolean;
      min?: number;
      max?: number;
      step?: number;
      pattern?: string;
      patternError?: string;
      showIf?: string;
    }>;
  };
}

export interface RetryConfig {
  maxAttempts: number;
  backoffFactor: number;
  initialInterval: number;
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

@Entity()
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column('jsonb')
  steps: WorkflowStep[];

  @Column('jsonb', { nullable: true })
  inputSchema: Record<string, any>;

  @Column('jsonb', { nullable: true })
  outputSchema: Record<string, any>;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
