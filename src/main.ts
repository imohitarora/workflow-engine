import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  // Register Handlebars helpers
  const hbs = require('hbs');
  hbs.registerHelper('formatDate', function(date) {
    return new Date(date).toLocaleString();
  });

  await app.listen(3000);
}
bootstrap();
