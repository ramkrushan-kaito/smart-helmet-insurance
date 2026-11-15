import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HelmetStatus, Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit-logs/audit.service';
import { assertOwnsCustomer, scopedCustomerId } from '../common/access';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import { AuthUser } from '../common/types';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { CreateHelmetDto, HelmetQueryDto, UpdateHelmetDto } from './dto';

const helmetInclude = {
  customer: { select: { id: true, fullName: true, customerCode: true, mobile: true } },
  qrCode: true,
  vehicleMapping: { include: { vehicle: true } },
} satisfies Prisma.HelmetInclude;

@Injectable()
export class HelmetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly audit: AuditService,
    private readonly qr: QrCodesService,
  ) {}

  async list(query: HelmetQueryDto, actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const own = scopedCustomerId(actor);
    const where: Prisma.HelmetWhereInput = {
      deletedAt: null,
      status: query.status,
      customerId: own ?? query.customerId,
      ...(search
        ? {
            OR: [
              { helmetCode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'helmetCode', 'brand', 'status'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.helmet.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: query.order ?? 'desc' },
        include: helmetInclude,
      }),
      this.prisma.helmet.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const helmet = await this.prisma.helmet.findFirst({ where: { id, deletedAt: null }, include: helmetInclude });
    if (!helmet) throw new NotFoundException('Helmet not found.');
    if (helmet.customerId) assertOwnsCustomer(actor, helmet.customerId);
    else if (actor.role === RoleName.CUSTOMER) throw new NotFoundException('Helmet not found.');
    return helmet;
  }

  async create(dto: CreateHelmetDto, actor: AuthUser, ip?: string) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } });
      if (!customer) throw new NotFoundException('Customer not found.');
    }
    try {
      const helmet = await this.prisma.$transaction(async (tx) => {
        const helmetCode = await this.sequences.next('helmet', 'HM', tx);
        return tx.helmet.create({
          data: {
            helmetCode,
            customerId: dto.customerId,
            brand: dto.brand.trim(),
            model: dto.model.trim(),
            color: dto.color.trim(),
            size: dto.size.trim(),
            serialNumber: dto.serialNumber.trim(),
            manufactureYear: dto.manufactureYear,
            status: dto.customerId ? HelmetStatus.ASSIGNED : HelmetStatus.UNASSIGNED,
            isDemo: true,
          },
          include: helmetInclude,
        });
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'CREATE',
        entity: 'helmets',
        entityId: helmet.id,
        ipAddress: ip,
        metadata: { helmetCode: helmet.helmetCode },
      });
      if (dto.generateQr) {
        const qr = await this.qr.generate({ helmetId: helmet.id }, actor, ip);
        return this.prisma.helmet.findUnique({ where: { id: helmet.id }, include: { ...helmetInclude, qrCode: true } }).then((row) => ({
          ...row,
          qrCode: qr,
        }));
      }
      return helmet;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async update(id: string, dto: UpdateHelmetDto, actor: AuthUser, ip?: string) {
    const helmet = await this.prisma.helmet.findFirst({ where: { id, deletedAt: null } });
    if (!helmet) throw new NotFoundException('Helmet not found.');
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        let customerId = helmet.customerId;
        if (dto.customerId !== undefined) {
          if (dto.customerId) {
            const customer = await tx.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } });
            if (!customer) throw new NotFoundException('Customer not found.');
          }
          customerId = dto.customerId;
        }
        if (dto.vehicleId) {
          const vehicle = await tx.vehicle.findFirst({ where: { id: dto.vehicleId, deletedAt: null } });
          if (!vehicle) throw new NotFoundException('Vehicle not found.');
          if (!customerId || vehicle.customerId !== customerId) {
            throw new BadRequestException('Vehicle and helmet must belong to the same customer.');
          }
          await tx.helmetVehicleMapping.upsert({
            where: { helmetId: id },
            create: { helmetId: id, vehicleId: vehicle.id },
            update: { vehicleId: vehicle.id, isActive: true },
          });
        }
        if (dto.vehicleId === null) {
          await tx.helmetVehicleMapping.deleteMany({ where: { helmetId: id } });
        }
        const status =
          dto.status ??
          (dto.customerId === null ? HelmetStatus.UNASSIGNED : dto.customerId ? HelmetStatus.ASSIGNED : undefined);
        return tx.helmet.update({
          where: { id },
          data: {
            customerId: dto.customerId === undefined ? undefined : dto.customerId,
            brand: dto.brand?.trim(),
            model: dto.model?.trim(),
            color: dto.color?.trim(),
            size: dto.size?.trim(),
            manufactureYear: dto.manufactureYear,
            status,
          },
          include: helmetInclude,
        });
      });
      await this.audit.log({ userId: actor.userId, action: 'UPDATE', entity: 'helmets', entityId: id, ipAddress: ip });
      return updated;
    } catch (error) {
      rethrowPrisma(error);
    }
  }
}
