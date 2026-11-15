import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit-logs/audit.service';
import { assertOwnsCustomer, scopedCustomerId } from '../common/access';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import { AuthUser, userPublicSelect } from '../common/types';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

const customerInclude = {
  user: { select: userPublicSelect },
  _count: { select: { helmets: true, vehicles: true, policies: true } },
} satisfies Prisma.CustomerInclude;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto, actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const own = scopedCustomerId(actor);
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(own ? { id: own } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
              { customerCode: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'fullName', 'customerCode', 'city'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: query.order ?? 'desc' },
        include: customerInclude,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: customerInclude,
    });
    if (!customer) throw new NotFoundException('Customer not found.');
    assertOwnsCustomer(actor, customer.id);
    return customer;
  }

  async create(dto: CreateCustomerDto, actor: AuthUser, ip?: string) {
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({ where: { name: RoleName.CUSTOMER } });
        if (!role) throw new BadRequestException('Customer role is missing. Seed the database first.');
        const code = await this.sequences.next('customer', 'CUST', tx);
        const user = await tx.user.create({
          data: {
            fullName: dto.fullName.trim(),
            mobile: dto.mobile,
            email: dto.email?.trim().toLowerCase(),
            roleId: role.id,
            status: 'ACTIVE',
          },
        });
        return tx.customer.create({
          data: {
            userId: user.id,
            customerCode: code,
            fullName: dto.fullName.trim(),
            mobile: dto.mobile,
            email: dto.email?.trim().toLowerCase(),
            address: dto.address?.trim(),
            city: dto.city?.trim(),
            state: dto.state?.trim(),
            pincode: dto.pincode,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            isDemo: true,
          },
          include: customerInclude,
        });
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'CREATE',
        entity: 'customers',
        entityId: customer.id,
        ipAddress: ip,
      });
      await this.prisma.notification.create({
        data: {
          userId: customer.userId,
          title: 'Welcome to Smart Helmet Insurance',
          message: 'DEMO DATA: your customer profile is ready. Sign in with OTP 123456.',
          channel: 'IN_APP',
        },
      });
      return customer;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async update(id: string, dto: UpdateCustomerDto, actor: AuthUser, ip?: string) {
    const existing = await this.findOne(id, actor);
    const data: Prisma.CustomerUpdateInput = {};
    const staff = actor.role !== RoleName.CUSTOMER;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.pincode !== undefined) data.pincode = dto.pincode;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (staff && dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (staff && dto.mobile !== undefined) data.mobile = dto.mobile;
    if (staff && dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (!staff && (dto.fullName || dto.mobile || dto.dateOfBirth)) {
      throw new BadRequestException('Only an administrator can change name, mobile or date of birth.');
    }
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.customer.update({ where: { id: existing.id }, data, include: customerInclude });
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            fullName: staff && dto.fullName ? dto.fullName.trim() : undefined,
            mobile: staff && dto.mobile ? dto.mobile : undefined,
            email: dto.email?.toLowerCase(),
          },
        });
        return updated;
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'UPDATE',
        entity: 'customers',
        entityId: id,
        ipAddress: ip,
      });
      return customer;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async remove(id: string, actor: AuthUser, ip?: string) {
    const existing = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Customer not found.');
    const stamp = Date.now();
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id },
        data: { deletedAt: new Date(), mobile: `${existing.mobile}#deleted#${stamp}`, email: existing.email ? `${existing.email}#deleted#${stamp}` : null },
      }),
      this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE',
          mobile: `${existing.mobile}#deleted#${stamp}`,
          email: existing.email ? `${existing.email}#deleted#${stamp}` : null,
        },
      }),
    ]);
    await this.audit.log({
      userId: actor.userId,
      action: 'DELETE',
      entity: 'customers',
      entityId: id,
      ipAddress: ip,
      metadata: { customerCode: existing.customerCode },
    });
    return { success: true };
  }
}
