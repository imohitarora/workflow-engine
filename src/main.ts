import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Workflow Engine API')
    .setDescription('API documentation for the Workflow Engine')
    .setVersion('1.0')
    .addTag('workflows')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  Logger.log(
    `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
  Logger.log('Swagger running on http://localhost:3000/api', 'Bootstrap');
}
bootstrap();
