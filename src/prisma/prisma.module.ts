import { Module, Global, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, Logger],
  exports: [PrismaService],
})
export class PrismaModule {}
