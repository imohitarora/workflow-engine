import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { StepType } from '../enums/step-type.enum';

export class StepConfigDto {
  @ApiProperty({ description: 'Type of task (script, http, human)' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Handler for the task' })
  @IsString()
  @IsOptional()
  handler?: string;

  @IsString()
  @IsOptional()
  script?: string;

  @ApiProperty({ description: 'Input mapping for the task' })
  @IsObject()
  inputMapping: Record<string, string>;

  @ApiProperty({ description: 'Output mapping for the task' })
  @IsObject()
  outputMapping: Record<string, string>;
}

export class RetryConfigDto {
  @ApiProperty({ description: 'Maximum number of attempts' })
  @IsNumber()
  maxAttempts: number;

  @ApiProperty({ description: 'Backoff multiplier' })
  @IsNumber()
  backoffMultiplier: number;

  @ApiProperty({ description: 'Initial delay in milliseconds' })
  @IsNumber()
  initialDelay: number;
}

export class ConditionDto {
  @ApiProperty({ description: 'Condition expression' })
  @IsString()
  expression: string;

  @ApiProperty({ description: 'Condition type' })
  @IsEnum(['javascript', 'jsonpath'])
  type: 'javascript' | 'jsonpath';
}

export class WorkflowStepDto {
  @ApiProperty({ description: 'Unique identifier for the workflow step' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Unique key for the workflow step' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Name of the workflow step' })
  @IsString()
  name: string;

  @ApiProperty({ enum: StepType, description: 'Type of the workflow step' })
  @IsEnum(StepType)
  type: StepType;

  @ApiProperty({ description: 'List of step IDs that this step depends on' })
  @IsArray()
  @IsString({ each: true })
  dependencies: string[];

  @ApiProperty({
    description: 'Configuration for the step execution',
    type: StepConfigDto,
  })
  @ValidateNested()
  @Type(() => StepConfigDto)
  config: StepConfigDto;

  @ApiPropertyOptional({
    description: 'Retry configuration for failed steps',
    type: RetryConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryConfigDto)
  retryConfig?: RetryConfigDto;

  @ApiPropertyOptional({
    description: 'Timeout in milliseconds for the step execution',
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Condition for step execution',
    type: ConditionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionDto)
  condition?: ConditionDto;
}
