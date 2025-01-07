import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StepExecution } from './step-execution.entity';

@Entity('workflow_states')
export class WorkflowState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => StepExecution, (stepExecution) => stepExecution.step)
  stepExecutions: StepExecution[];

  @Column('jsonb')
  variables: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
