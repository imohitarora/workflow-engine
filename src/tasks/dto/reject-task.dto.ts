// src/tasks/dto/reject-task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectTaskDto {
  @ApiProperty()
  @IsString()
  comments: string;
}
