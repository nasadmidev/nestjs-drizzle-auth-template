import { ForbiddenException, ValidationPipeOptions } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/internal';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { HelmetOptions } from 'helmet';
import { relations } from './db/relations';
import { migrate } from 'drizzle-orm/pg-core';
import { JwtModuleOptions } from '@nestjs/jwt';
import ms, { StringValue } from 'ms';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { DrizzleModuleAsyncOptions } from '@nestjs/drizzle';

export const corsOptions: CorsOptions = {
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

export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`],
      imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
      scriptSrc: [`'self'`],
    },
  },
};

export const loadDrizzle = (
  env: 'test' | 'default' = 'default',
): DrizzleModuleAsyncOptions => ({
  useFactory: async () => {
    const db = drizzle(
      env === 'default'
        ? process.env.DATABASE_URL!
        : process.env.DATABASE_TESTING_URL!,
      { relations },
    );

    await migrate([], db, { migrationsFolder: '../drizzle' });
    return { db };
  },
});

export const jwtSettings: JwtModuleOptions = {
  global: true,
  secret: process.env.JWT_SECRET ?? 'secret',
  signOptions: {
    expiresIn: (process.env.JWT_EXPIRES as StringValue) ?? '1h',
  },
};

export const throttlerSettings: ThrottlerModuleOptions = [
  {
    name: 'default',
    ttl: 60000,
    limit: ms('1m'),
  },
];

export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
