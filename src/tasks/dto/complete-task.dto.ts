import { ApiProperty } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  formData: Record<string, any>;
}
