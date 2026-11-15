import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuthUser } from '../common/types';
import { CreateProductDto, UpdateProductDto } from './dto';
import { InsuranceProductsService } from './insurance-products.service';

@ApiTags('insurance-products')
@ApiBearerAuth()
@Controller('insurance-products')
export class InsuranceProductsController {
  constructor(private readonly products: InsuranceProductsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.products.list(query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    return this.products.create(dto, actor, ip);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.products.update(id, dto, actor, ip);
  }
}
