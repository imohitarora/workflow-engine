import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WorkflowDefinition } from '../src/workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from '../src/workflow/entities/workflow-instance.entity';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async (): Promise<TypeOrmModuleOptions> => {
        // First try to drop the database if it exists
        const tempDataSource = new DataSource({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'postgres', // Connect to default database
        });

        try {
          await tempDataSource.initialize();
          await tempDataSource.query('DROP DATABASE IF EXISTS workflow_engine_test;');
          await tempDataSource.query('CREATE DATABASE workflow_engine_test;');
        } catch (error) {
          console.error('Error preparing test database:', error);
        } finally {
          await tempDataSource.destroy();
        }

        // Return the configuration for the test database
        return {
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'workflow_engine_test',
          entities: [WorkflowDefinition, WorkflowInstance],
          synchronize: true,
          logging: false,
        };
      },
    }),
  ],
})
export class TestDatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async onModuleDestroy() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
