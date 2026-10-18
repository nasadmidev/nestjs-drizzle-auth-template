import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { type StringValue } from 'ms';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { JwtGuard } from './auth/jwt/jwt.guard';
import { RolesGuard } from './auth/roles/role.guard';
import { DrizzleModule } from '@nestjs/drizzle';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/pg-core';
import ms from 'ms';
import { relations } from './db/relations';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule.forRootAsync({
      useFactory: async () => {
        const db = drizzle(process.env.DATABASE_URL!, { relations });
        await migrate([], db, { migrationsFolder: '../drizzle' });
        return { db };
      },
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES as StringValue) ?? '1h',
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: ms('1m'),
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    HealthModule,
  ],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: JwtGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
