import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit-logs/audit.service';
import { pageArgs, pageResult } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { AuthUser } from '../common/types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class InsuranceProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.InsuranceProductWhereInput = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.insuranceProduct.findMany({ where, skip, take, orderBy: { createdAt: 'asc' } }),
      this.prisma.insuranceProduct.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async create(dto: CreateProductDto, actor: AuthUser, ip?: string) {
    try {
      const product = await this.prisma.insuranceProduct.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description.trim(),
          coverageAmount: dto.coverageAmount,
          premiumAmount: dto.premiumAmount,
          durationMonths: dto.durationMonths,
          isDemo: true,
        },
      });
      await this.audit.log({ userId: actor.userId, action: 'CREATE', entity: 'insurance_products', entityId: product.id, ipAddress: ip });
      return product;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthUser, ip?: string) {
    const existing = await this.prisma.insuranceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Insurance product not found.');
    const product = await this.prisma.insuranceProduct.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        coverageAmount: dto.coverageAmount,
        premiumAmount: dto.premiumAmount,
        durationMonths: dto.durationMonths,
        isActive: dto.isActive,
      },
    });
    await this.audit.log({ userId: actor.userId, action: 'UPDATE', entity: 'insurance_products', entityId: id, ipAddress: ip });
    return product;
  }
}
