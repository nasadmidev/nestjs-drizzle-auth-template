import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { TokenCleanupService } from './token-cleanup/token-cleanup.service';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [UserModule],
  providers: [AuthService, LocalStrategy, TokenCleanupService],
  controllers: [AuthController],
})
export class AuthModule {}
