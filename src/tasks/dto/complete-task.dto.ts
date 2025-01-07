import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class CompleteTaskDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  formData: Record<string, any>;
}
