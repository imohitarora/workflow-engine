import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowStep } from './workflow-step.entity';
import { StepStatus } from '../enums/step-status.enum';

@Entity('step_executions')
export class StepExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkflowStep)
  step: WorkflowStep;

  @Column('uuid')
  stepId: string;

  @Column({ type: 'enum', enum: StepStatus })
  status: StepStatus;

  @CreateDateColumn()
  startTime: Date;

  @UpdateDateColumn()
  endTime?: Date;

  @Column('jsonb', { nullable: true })
  output?: Record<string, any>;

  @Column('text', { nullable: true })
  error?: string;

  @Column('int', { default: 0 })
  attempts: number;
}
