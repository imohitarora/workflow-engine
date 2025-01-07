import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepStatus } from '../../workflow/enums/step-status.enum';
import { IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @ApiProperty({
    description: 'Unique identifier for the task (instanceId-stepId)',
  })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Task name from workflow definition' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Task type (e.g., approval, data-entry)' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'ID of the workflow instance this task belongs to',
  })
  @IsString()
  workflowInstanceId: string;

  @ApiProperty({ description: 'Step ID from workflow definition' })
  @IsString()
  stepId: string;

  @ApiProperty({
    enum: StepStatus,
    description: 'Current status of the task',
  })
  @IsEnum(StepStatus)
  status: StepStatus;

  @ApiPropertyOptional({
    type: TaskFormDto,
    description: 'Form configuration if task requires user input',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskFormDto)
  form?: TaskFormDto;

  @ApiPropertyOptional({ description: 'Error message if task failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class CompleteTaskDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Form data submitted by user',
  })
  formData: Record<string, any>;
}

export class RejectTaskDto {
  @ApiProperty({ description: 'Reason for rejecting the task' })
  @IsString()
  reason: string;
}
