import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserService } from '@/user/user.service';
import { LocalStrategy } from './strategies/local.strategy';
import { TokenCleanupService } from './token-cleanup/token-cleanup.service';

@Module({
  imports: [],
  providers: [AuthService, UserService, LocalStrategy, TokenCleanupService],
  controllers: [AuthController],
})
export class AuthModule {}
