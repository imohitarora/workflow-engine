import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowStepDto } from './workflow-step.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkflowDefinitionDto {
  @ApiProperty({ description: 'Name of the workflow definition' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of what the workflow does' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Array of workflow steps that define the workflow',
    type: [WorkflowStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiProperty({
    description: 'JSON Schema for workflow input validation',
    example: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @IsObject()
  inputSchema: Record<string, any>;

  @ApiProperty({
    description: 'JSON Schema for workflow output validation',
    example: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  @IsObject()
  outputSchema: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the workflow definition is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
