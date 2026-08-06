import { JwtGuard } from '@/auth/jwt/jwt.guard';
import { Roles } from '@/auth/roles/role.decorator';
import { Role } from '@/generated/prisma/enums';
import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';
import { Public } from '@/auth/jwt/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  check() {
    return this.health.check([]);
  }

  @Get('prisma')
  @UseGuards(JwtGuard)
  @Roles(Role['ADMIN'])
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check database connectivity (admin only)' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  checkPrisma() {
    return this.health.check([
      () => this.prisma.pingCheck('prisma', new PrismaService(new Logger())),
    ]);
  }
}
