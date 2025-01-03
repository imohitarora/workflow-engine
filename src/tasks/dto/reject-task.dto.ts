import { ApiProperty } from '@nestjs/swagger';

export class RejectTaskDto {
  @ApiProperty()
  reason: string;
}
