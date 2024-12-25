import { IsString, IsObject } from 'class-validator';

export class StartWorkflowDto {
  @IsString()
  workflowDefinitionId: string;

  @IsObject()
  input: Record<string, any>;
}
