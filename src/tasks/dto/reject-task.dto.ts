import { ApiProperty } from '@nestjs/swagger';

export class RejectTaskDto {
  @ApiProperty({ 
    type: 'object', 
    additionalProperties: true,
    description: 'Form data submitted by user'
  })
  formData: Record<string, any>;
}
