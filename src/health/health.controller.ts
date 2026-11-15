import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../common/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException(
        'PostgreSQL is unavailable. This application requires PostgreSQL and will not use another database.',
      );
    }
    return {
      status: 'ok',
      database: 'postgresql',
      demoMode: this.config.get('DEMO_OTP_ENABLED') === 'true',
      smsConfigured: false,
      qrPublicBaseUrl: this.config.get('QR_PUBLIC_BASE_URL'),
      timestamp: new Date().toISOString(),
    };
  }
}
