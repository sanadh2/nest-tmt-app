import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { AllExceptionsFilter } from './errorhandler';
import { ValidationPipe } from '@nestjs/common';
import './config/env.validation';
import { env } from './config/env.validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import cookieParser from 'cookie-parser';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('env', env);
  if (env.DEBUG_MODE === true) {
    app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  } else {
    app.useLogger(['log', 'error', 'warn']);
  }

  const config = new DocumentBuilder()
    .setTitle('Auth Microservice')
    .setDescription('Handles user registration, login, session-based auth.')
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();

  const redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    username: env.REDIS_USERNAME,
  });

  const store = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  });

  app.use(cookieParser());

  app.use(
    session({
      store,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,
      },
    }),
  );

  // app.use(new CsrfMiddleware().use);

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(env.PORT);
}
bootstrap();
