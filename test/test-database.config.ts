import { DataSource } from 'typeorm';
import { WorkflowDefinition } from '../src/workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from '../src/workflow/entities/workflow-instance.entity';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'workflow_engine_test',
  schema: 'public', // Use a separate schema for tests
  entities: [WorkflowDefinition, WorkflowInstance],
  synchronize: true,
});
