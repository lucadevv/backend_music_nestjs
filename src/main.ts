import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  const apiPrefix = configService.get<string>('app.apiPrefix');

  app.setGlobalPrefix(apiPrefix ?? '');

  // Security headers with Helmet
  app.use(helmet());

  // CORS configuration
  const corsOrigins = configService.get<string>('app.corsOrigins');
  app.enableCors({
    origin: corsOrigins?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Music App API')
    .setDescription('API REST para aplicación de música con autenticación JWT')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa el token JWT',
        in: 'header',
      },
      'JWT-auth', // Este nombre se usará en los decoradores @ApiBearerAuth()
    )
    .addTag('auth', 'Endpoints de autenticación')
    .addTag('music', 'Endpoints de música y exploración')
    .addTag('library', 'Endpoints de biblioteca del usuario')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port ?? 3000);
  console.log(`🚀 Aplicación corriendo en: http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Documentación Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
