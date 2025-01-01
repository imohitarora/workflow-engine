import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowDefinitionDto } from './create-workflow-definition.dto';

export class UpdateWorkflowDefinitionDto extends PartialType(
  CreateWorkflowDefinitionDto,
) {}
