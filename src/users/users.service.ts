import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit-logs/audit.service';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { userPublicSelect, AuthUser } from '../common/types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateStaffDto, UpdateUserStatusDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.ADMIN] } },
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'fullName', 'email'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: query.order ?? 'desc' },
        select: userPublicSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async create(dto: CreateStaffDto, actor: AuthUser, ip?: string) {
    if (dto.role === RoleName.CUSTOMER) {
      throw new BadRequestException('Create customers from the customer screen.');
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, 10),
          status: 'ACTIVE',
          role: { connect: { name: dto.role } },
        },
        select: userPublicSelect,
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'CREATE',
        entity: 'users',
        entityId: user.id,
        ipAddress: ip,
        metadata: { role: dto.role },
      });
      return user;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actor: AuthUser, ip?: string) {
    if (id === actor.userId && dto.status !== 'ACTIVE') {
      throw new BadRequestException('You cannot deactivate your own account.');
    }
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } });
    if (!existing) throw new NotFoundException('User not found.');
    if (existing.role.name === RoleName.SUPER_ADMIN && dto.status !== 'ACTIVE') {
      const other = await this.prisma.user.count({
        where: { deletedAt: null, status: 'ACTIVE', role: { name: RoleName.SUPER_ADMIN }, id: { not: id } },
      });
      if (other === 0) throw new BadRequestException('Keep at least one active super admin.');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: userPublicSelect,
    });
    await this.audit.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entity: 'users',
      entityId: id,
      ipAddress: ip,
      metadata: { status: dto.status },
    });
    return user;
  }
}
