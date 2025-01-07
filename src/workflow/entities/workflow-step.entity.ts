import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { StepType } from '../enums/step-type.enum';

@Entity('workflow_steps')
export class WorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StepType })
  type: StepType;

  @Column('simple-array')
  dependencies: string[];

  @Column('jsonb')
  config: Record<string, any>;
}
