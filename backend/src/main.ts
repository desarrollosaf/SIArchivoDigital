import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  // A diferencia de SIPresupuesto, no se publica /uploads como estático: los documentos se
  // entregan por endpoints autenticados que validan que el usuario tenga acceso al registro.
  await app.listen(process.env.PORT ?? 3060);
}
void bootstrap();
