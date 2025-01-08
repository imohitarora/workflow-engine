// test/jest-e2e.setup.ts
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { WorkflowModule } from '../src/workflow/workflow.module';

let app: INestApplication;
let moduleFixture: TestingModule;

beforeAll(async () => {
  moduleFixture = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'workflow_engine_test', // Separate test database
        autoLoadEntities: true,
        synchronize: true,
        dropSchema: true, // Cleans database before tests
      }),
      WorkflowModule,
    ],
    controllers: [AppController],
    providers: [AppService],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

export { app, moduleFixture };
