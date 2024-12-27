import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartWorkflowDto {
  @ApiProperty({
    description: 'ID of the workflow definition to execute',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  workflowDefinitionId: string;

  @ApiProperty({
    description: 'Input data for the workflow',
    example: {
      email: 'user@example.com',
      orderId: '12345',
      amount: 99.99
    }
  })
  @IsObject()
  input: Record<string, any>;
}
