import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { JwtGuard } from './auth/jwt/jwt.guard';
import { RolesGuard } from './auth/roles/role.guard';
import { DrizzleModule as NestDrizzle } from '@nestjs/drizzle';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DrizzleModule } from './db/drizzle.module';
import { loadDrizzle, jwtSettings, throttlerSettings } from './settings';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NestDrizzle.forRootAsync(loadDrizzle()),
    JwtModule.register(jwtSettings),
    ThrottlerModule.forRoot(throttlerSettings),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    HealthModule,
    DrizzleModule,
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
