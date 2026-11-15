import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/types';
import { CreatePolicyDto, CreateRenewalDto, PolicyQueryDto, UpdatePolicyDto, UpdateRenewalDto } from './dto';
import { PoliciesService } from './policies.service';
import { Query } from '@nestjs/common';

@ApiTags('policies')
@ApiBearerAuth()
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get()
  list(@Query() query: PolicyQueryDto, @CurrentUser() actor: AuthUser) {
    return this.policies.list(query, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreatePolicyDto, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    return this.policies.create(dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get('renewal-requests')
  renewals(@CurrentUser() actor: AuthUser) {
    return this.policies.listRenewals(actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch('renewal-requests/:requestId')
  updateRenewal(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: UpdateRenewalDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.policies.updateRenewal(requestId, dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.policies.findOne(id, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.policies.update(id, dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Post(':id/renewal-requests')
  requestRenewal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRenewalDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.policies.requestRenewal(id, dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Post(':id/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.policies.addDocument(id, file, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get(':id/documents/:docId/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const file = await this.policies.documentFile(id, docId, actor);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
