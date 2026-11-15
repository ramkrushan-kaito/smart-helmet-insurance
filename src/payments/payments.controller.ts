import { Body, Controller, Get, Ip, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/types';
import { CreatePaymentDto, PaymentQueryDto } from './dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
  @Get()
  list(@Query() query: PaymentQueryDto, @CurrentUser() actor: AuthUser) {
    return this.payments.list(query, actor);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() actor: AuthUser, @Ip() ip: string) {
    return this.payments.create(dto, actor, ip);
  }
}
