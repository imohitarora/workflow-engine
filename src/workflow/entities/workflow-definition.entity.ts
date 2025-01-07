import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn
} from 'typeorm';
import { WorkflowStep } from './workflow-step.entity';

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

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @OneToMany(() => WorkflowStep, step => step.workflowDefinition)
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
