import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'workflow_engine',
      autoLoadEntities: true,
      synchronize: true,
    }),
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
