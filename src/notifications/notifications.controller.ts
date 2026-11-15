import { Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, RoleName } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { pageArgs, pageResult } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { AuthUser } from '../common/types';

class NotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  unread?: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.CUSTOMER)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: NotificationQueryDto, @CurrentUser() actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const staff = actor.role !== RoleName.CUSTOMER;
    const where: Prisma.NotificationWhereInput = {
      ...(staff ? {} : { userId: actor.userId }),
      ...(query.unread === 'true' ? { isRead: false } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  @Post('read-all')
  async readAll(@CurrentUser() actor: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: actor.userId, isRead: false }, data: { isRead: true } });
    return { success: true };
  }

  @Patch(':id/read')
  async readOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    const note = await this.prisma.notification.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Notification not found.');
    if (actor.role === RoleName.CUSTOMER && note.userId !== actor.userId) {
      throw new ForbiddenException('You can only access your own records.');
    }
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
}
