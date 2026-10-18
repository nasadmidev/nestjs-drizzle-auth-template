import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet, { type HelmetOptions } from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DrizzleExceptionFilter } from './db/drizzle-exception/drizzle-exception.filter';
import cookieParser from 'cookie-parser';

const corsOptions: CorsOptions = {
  methods: ['GET', 'OPTION', 'DELETE', 'PUT', 'POST', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Content-Length', 'Authorization'],
  preflightContinue: true,
  optionsSuccessStatus: 200,
  credentials: true,
  origin: (o, cb) => {
    const whitelist = process.env.WHITELIST ?? null;
    if (!o) {
      return cb(null, true);
    }

    if (!whitelist) {
      return cb(new ForbiddenException('Blocked by CORS Policy'), false);
    }

    if (
      whitelist.split(',').find((validOrigins) => validOrigins.trim() === o)
    ) {
      return cb(null, true);
    }

    return cb(new ForbiddenException('Blocked by CORS Policy'), false);
  },
};

const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`],
      imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
      scriptSrc: [`'self'`],
    },
  },
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new DrizzleExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors(corsOptions);
  app.use(helmet(helmetOptions));
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('NestJS Drizzle Template API')
    .setDescription('API documentation for NestJS Drizzle Template')
    .setVersion('1.2')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  if (process.env.NODE_ENV === 'development')
    SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
