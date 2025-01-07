// src/tasks/entities/task-execution.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowInstance } from '../../workflow/entities/workflow-instance.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskFormDto } from '../dto/task.dto';

@Entity('task_executions')
export class TaskExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workflowInstanceId: string;

  @ManyToOne(() => WorkflowInstance)
  @JoinColumn({ name: 'workflowInstanceId' })
  workflowInstance: WorkflowInstance;

  @Column()
  stepId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column('jsonb', { nullable: true })
  form?: TaskFormDto;

  @Column('jsonb', { nullable: true })
  formData?: Record<string, any>;

  @Column('text', { nullable: true })
  comments?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}