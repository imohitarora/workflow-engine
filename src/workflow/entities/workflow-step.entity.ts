import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { StepType } from '../enums/step-type.enum';
import { WorkflowDefinition } from './workflow-definition.entity';
import { StepConfigDto } from '../dto/workflow-step.dto';

@Entity('workflow_steps')
export class WorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column()
  name: string;

  @ManyToOne(() => WorkflowDefinition, definition => definition.steps)
  workflowDefinition: WorkflowDefinition;

  @Column('uuid')
  workflowDefinitionId: string;

  @Column({ type: 'enum', enum: StepType })
  type: StepType;

  @Column('simple-array')
  dependencies: string[];

  @Column('jsonb')
  config: StepConfigDto;
}
