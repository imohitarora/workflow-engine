import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowModule } from './workflow/workflow.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from './workflow/entities/workflow-instance.entity';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'workflow_engine',
      entities: [WorkflowDefinition, WorkflowInstance],
      synchronize: true,
    }),
    WorkflowModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
