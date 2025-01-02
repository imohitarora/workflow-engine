import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Workflow Engine API')
    .setDescription('API documentation for the Workflow Engine')
    .setVersion('1.0')
    .addTag('workflows')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Register Handlebars helpers
  const hbs = require('hbs');
  hbs.registerHelper('formatDate', function (date) {
    return new Date(date).toLocaleString();
  });

  await app.listen(3000);
}
bootstrap();
