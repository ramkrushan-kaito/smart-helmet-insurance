import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/types';
import { CreateVehicleDto, UpdateVehicleDto, VehicleQueryDto } from './dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get()
  list(@Query() query: VehicleQueryDto, @CurrentUser() actor: AuthUser) {
    return this.vehicles.list(query, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleDto, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    return this.vehicles.create(dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.vehicles.findOne(id, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.vehicles.update(id, dto, actor, ip);
  }
}
