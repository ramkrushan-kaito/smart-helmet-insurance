import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditAction, Prisma, RoleName } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';

class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  entity?: string;
}

@ApiTags('audit-logs')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: AuditQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.AuditLogWhereInput = {
      action: query.action,
      entity: query.entity?.trim() || undefined,
    };
    const sort = sortField(query.sort, ['createdAt', 'entity', 'action'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: query.order ?? 'desc' },
        include: { user: { select: { id: true, fullName: true, email: true, mobile: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }
}
