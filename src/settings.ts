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
import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'node:path';
import type { PrettyOptions } from 'pino-pretty';
import { Request, Response } from 'express';

const sensitiveFieldPattern =
  /password|token|secret|authorization|cookie|api[-_]?key/i;

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValues);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveFieldPattern.test(key)
          ? '[REDACTED]'
          : redactSensitiveValues(item),
      ]),
    );
  }
  return value;
}

function redactHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      sensitiveFieldPattern.test(key)
        ? '[REDACTED]'
        : redactSensitiveValues(value),
    ]),
  );
}

function responseLogMessage(_req: Request, res: Response): string {
  const headers = res.getHeaders() as Record<string, unknown>;
  const setCookie = headers['set-cookie'];
  const cookies = Array.isArray(setCookie)
    ? setCookie.map((cookie) => `${String(cookie).split('=', 1)[0]}=[REDACTED]`)
    : setCookie
      ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
        [`${String(setCookie).split('=', 1)[0]}=[REDACTED]`]
      : [];
  const responseData = JSON.stringify(
    {
      body: redactSensitiveValues(res.locals.responseBody ?? {}),
      headers: redactHeaders(headers),
      cookies,
    },
    null,
    2,
  );
  return `${res.req.method} ${res.req.url} ${res.statusCode}\n${responseData}`;
}

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

export const mailerOptions: MailerOptions = {
  transport: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    auth: {
      user: process.env.SMTP_USER ?? 'user',
      pass: process.env.SMTP_PASSWORD ?? 'pass',
    },
  },
  defaults: { from: '"No Reply" <noreply@example.com>' },
  template: {
    dir: join(__dirname, 'mail', 'templates'),
    adapter: new HandlebarsAdapter(),
  },
};

export const pinoOptions = ({ ignorePaths }: { ignorePaths: string[] }) => ({
  pinoHttp: {
    level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
    autoLogging: {
      ignore: (req: Request) => ignorePaths.includes(req.url),
    },
    customSuccessMessage: responseLogMessage,
    customErrorMessage: responseLogMessage,
    transport: {
      target: 'pino-pretty',
      options: {
        singleLine: false,
        translateTime: 'SYS:standard',
        colorize: true,
        ignore: 'req,res,responseTime',
      } satisfies PrettyOptions,
    },
  },
});
