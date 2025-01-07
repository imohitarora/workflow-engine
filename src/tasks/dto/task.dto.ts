import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepStatus } from '../../workflow/enums/step-status.enum';
import { IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../enums/task-status.enum';

export class TaskFormFieldDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  multiline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  max?: number;

  @ApiPropertyOptional()
  @IsOptional()
  step?: number;

  @ApiPropertyOptional()
  @IsOptional()
  pattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  patternError?: string;
}

export class TaskFormDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ type: [TaskFormFieldDto] })
  @ValidateNested({ each: true })
  @Type(() => TaskFormFieldDto)
  fields: TaskFormFieldDto[];
}

export class TaskDto {
  @ApiProperty({ description: 'Unique identifier for the task (instanceId-stepId)' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Task name from workflow definition' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Task type (e.g., approval, data-entry)' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'ID of the workflow instance this task belongs to' })
  @IsString()
  workflowInstanceId: string;

  @ApiProperty({ description: 'Step ID from workflow definition' })
  @IsString()
  stepId: string;

  @ApiProperty({
    enum: TaskStatus,
    description: 'Current status of the task'
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiPropertyOptional({
    type: TaskFormDto,
    description: 'Form configuration if task requires user input'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskFormDto)
  form?: TaskFormDto;

  @ApiPropertyOptional()
  formData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Error message if task failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Comments by user' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
