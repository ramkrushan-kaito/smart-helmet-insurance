import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit-logs/audit.service';
import { assertOwnsCustomer, scopedCustomerId } from '../common/access';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import { AuthUser } from '../common/types';
import { CreateVehicleDto, UpdateVehicleDto, VehicleQueryDto } from './dto';

const vehicleInclude = {
  customer: { select: { id: true, fullName: true, customerCode: true } },
  helmetMappings: { include: { helmet: { select: { id: true, helmetCode: true, brand: true, model: true } } } },
} satisfies Prisma.VehicleInclude;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly audit: AuditService,
  ) {}

  async list(query: VehicleQueryDto, actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const own = scopedCustomerId(actor);
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      customerId: own ?? query.customerId,
      ...(search
        ? {
            OR: [
              { registrationNumber: { contains: search, mode: 'insensitive' } },
              { vehicleCode: { contains: search, mode: 'insensitive' } },
              { make: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'registrationNumber', 'make'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({ where, skip, take, orderBy: { [sort]: query.order ?? 'desc' }, include: vehicleInclude }),
      this.prisma.vehicle.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, include: vehicleInclude });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    assertOwnsCustomer(actor, vehicle.customerId);
    return vehicle;
  }

  async create(dto: CreateVehicleDto, actor: AuthUser, ip?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found.');
    try {
      const vehicle = await this.prisma.$transaction(async (tx) => {
        const vehicleCode = await this.sequences.next('vehicle', 'VH', tx);
        return tx.vehicle.create({
          data: {
            vehicleCode,
            customerId: dto.customerId,
            registrationNumber: dto.registrationNumber.trim().toUpperCase(),
            type: dto.type,
            make: dto.make.trim(),
            model: dto.model.trim(),
            year: dto.year,
            color: dto.color.trim(),
            chassisNumber: dto.chassisNumber.trim().toUpperCase(),
            engineNumber: dto.engineNumber.trim().toUpperCase(),
            isDemo: true,
          },
          include: vehicleInclude,
        });
      });
      await this.audit.log({ userId: actor.userId, action: 'CREATE', entity: 'vehicles', entityId: vehicle.id, ipAddress: ip });
      return vehicle;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async update(id: string, dto: UpdateVehicleDto, actor: AuthUser, ip?: string) {
    await this.findOne(id, actor);
    try {
      const vehicle = await this.prisma.vehicle.update({
        where: { id },
        data: {
          registrationNumber: dto.registrationNumber?.trim().toUpperCase(),
          type: dto.type,
          make: dto.make?.trim(),
          model: dto.model?.trim(),
          year: dto.year,
          color: dto.color?.trim(),
        },
        include: vehicleInclude,
      });
      await this.audit.log({ userId: actor.userId, action: 'UPDATE', entity: 'vehicles', entityId: id, ipAddress: ip });
      return vehicle;
    } catch (error) {
      rethrowPrisma(error);
    }
  }
}
