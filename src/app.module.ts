import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowModule } from './workflow/workflow.module';
import { ViewsController } from './views/views.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './workflow/entities/workflow-definition.entity';
import { WorkflowInstance } from './workflow/entities/workflow-instance.entity';

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
  ],
  controllers: [AppController, ViewsController],
  providers: [AppService],
})
export class AppModule {}
