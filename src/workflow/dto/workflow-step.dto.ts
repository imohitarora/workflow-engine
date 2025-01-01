import {
  IsString,
  IsEnum,
  IsArray,
  IsObject,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { StepType } from '../entities/workflow-definition.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowStepDto {
  @ApiProperty({ description: 'Unique identifier for the workflow step' })
  @IsString()
  id: string;

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
    example: {
      handler: 'sendEmail',
      inputMapping: { email: '$.input.email' },
      outputMapping: { result: '$.output.sent' },
    },
  })
  @IsObject()
  config: {
    handler: string;
    inputMapping: Record<string, string>;
    outputMapping: Record<string, string>;
  };

  @ApiPropertyOptional({
    description: 'Retry configuration for failed steps',
    example: {
      maxAttempts: 3,
      backoffMultiplier: 1.5,
      initialDelay: 1000,
    },
  })
  @IsOptional()
  @IsObject()
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };

  @ApiPropertyOptional({
    description: 'Timeout in milliseconds for the step execution',
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Condition for step execution',
    example: {
      expression: '$.input.amount > 1000',
      type: 'javascript',
    },
  })
  @IsOptional()
  @IsObject()
  condition?: {
    expression: string;
    type: 'javascript' | 'jsonpath';
  };
}
