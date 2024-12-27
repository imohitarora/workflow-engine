import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Workflow Engine API')
    .setDescription('API documentation for the Workflow Engine')
    .setVersion('1.0')
    .addTag('workflows')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);

  Logger.log('Server running on http://localhost:3000', 'Bootstrap');

  Logger.log('Swagger UI available at http://localhost:3000/api', 'Bootstrap');
}
bootstrap();
