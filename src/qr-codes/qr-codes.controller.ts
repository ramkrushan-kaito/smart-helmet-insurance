import { Body, Controller, Get, Header, HttpCode, Ip, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { createReadStream } from 'fs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/types';
import { GenerateQrDto, ScanQrDto, UpdateQrStatusDto } from './dto';
import { QrCodesService, QrQueryDto } from './qr-codes.service';

@ApiTags('qr-codes')
@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qr: QrCodesService) {}

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post('generate')
  generate(@Body() dto: GenerateQrDto, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    return this.qr.generate(dto, actor, ip);
  }

  @Public()
  @Post('scan')
  @HttpCode(200)
  scan(@Body() dto: ScanQrDto, @Ip() ip: string) {
    return this.qr.scan(dto.token, ip);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get()
  list(@Query() query: QrQueryDto) {
    return this.qr.list(query);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get(':id/download')
  @Header('Content-Type', 'image/png')
  async download(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    const file = await this.qr.image(id, actor, ip);
    return new StreamableFile(createReadStream(file.full), {
      type: 'image/png',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQrStatusDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.qr.updateStatus(id, dto, actor, ip);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.qr.findOne(id, actor);
  }
}
