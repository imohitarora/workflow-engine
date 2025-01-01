import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from '../src/workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from '../src/workflow/entities/workflow-instance.entity';

export const TestDatabaseModule = TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT, 10) || 5432,
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'workflow_engine_test',
  entities: [WorkflowDefinition, WorkflowInstance],
  synchronize: true, // Only for testing
  dropSchema: true, // Clean state for each test run
});
