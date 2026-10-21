import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim());
  app.enableCors({ origin: origins, methods: ['GET', 'POST', 'PATCH', 'DELETE'] });
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('NotionFlow API').setVersion('0.1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`NotionFlow API on :${port}  (docs: /api/docs)`);
}
bootstrap();
