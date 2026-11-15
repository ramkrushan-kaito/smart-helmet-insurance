import { BadRequestException, Body, Controller, Get, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma.service';

const editableKeys = ['app_name', 'support_email'] as const;

class UpdateSettingDto {
  @IsIn(editableKeys)
  key: (typeof editableKeys)[number];

  @IsString()
  @MaxLength(200)
  value: string;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get()
  async get() {
    const settings = await this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
    return {
      settings,
      runtime: {
        demoOtpEnabled: this.config.get('DEMO_OTP_ENABLED') === 'true',
        demoOtp: this.config.get('DEMO_OTP_ENABLED') === 'true' ? this.config.get('DEMO_OTP_CODE', '123456') : null,
        smsProvider: this.config.get('SMS_PROVIDER', 'none'),
        smsConfigured: false,
        qrPublicBaseUrl: this.config.get('QR_PUBLIC_BASE_URL'),
        environment: this.config.get('NODE_ENV', 'development'),
      },
    };
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Patch()
  async update(@Body() dto: UpdateSettingDto) {
    if (!editableKeys.includes(dto.key)) throw new BadRequestException('This setting cannot be changed here.');
    return this.prisma.appSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value.trim() },
      create: { key: dto.key, value: dto.value.trim() },
    });
  }
}
