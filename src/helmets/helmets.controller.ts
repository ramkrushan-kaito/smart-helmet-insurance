import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/types';
import { CreateHelmetDto, HelmetQueryDto, UpdateHelmetDto } from './dto';
import { HelmetsService } from './helmets.service';

@ApiTags('helmets')
@ApiBearerAuth()
@Controller('helmets')
export class HelmetsController {
  constructor(private readonly helmets: HelmetsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get()
  list(@Query() query: HelmetQueryDto, @CurrentUser() actor: AuthUser) {
    return this.helmets.list(query, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateHelmetDto, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    return this.helmets.create(dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.helmets.findOne(id, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHelmetDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.helmets.update(id, dto, actor, ip);
  }
}
