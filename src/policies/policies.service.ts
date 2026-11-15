import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PolicyStatus, Prisma, RenewalStatus, RoleName } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { AuditService } from '../audit-logs/audit.service';
import { assertOwnsCustomer, scopedCustomerId } from '../common/access';
import { assertAllowedUpload, documentAbsolute, documentsDir, extensionFor } from '../common/files';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import { AuthUser } from '../common/types';
import { CreatePolicyDto, CreateRenewalDto, PolicyQueryDto, UpdatePolicyDto, UpdateRenewalDto } from './dto';

const policyInclude = {
  customer: { select: { id: true, fullName: true, customerCode: true, mobile: true } },
  vehicle: true,
  product: true,
  helmet: { select: { id: true, helmetCode: true, brand: true, model: true } },
  documents: true,
  _count: { select: { claims: true, renewals: true } },
} satisfies Prisma.InsurancePolicyInclude;

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PolicyQueryDto, actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const own = scopedCustomerId(actor);
    const where: Prisma.InsurancePolicyWhereInput = {
      deletedAt: null,
      status: query.status,
      customerId: own ?? query.customerId,
      ...(search
        ? {
            OR: [
              { policyNumber: { contains: search, mode: 'insensitive' } },
              { customer: { fullName: { contains: search, mode: 'insensitive' } } },
              { vehicle: { registrationNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'policyNumber', 'status', 'endDate'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.insurancePolicy.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: query.order ?? 'desc' },
        include: policyInclude,
      }),
      this.prisma.insurancePolicy.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const policy = await this.prisma.insurancePolicy.findFirst({
      where: { id, deletedAt: null },
      include: policyInclude,
    });
    if (!policy) throw new NotFoundException('Policy not found.');
    assertOwnsCustomer(actor, policy.customerId);
    return policy;
  }

  async create(dto: CreatePolicyDto, actor: AuthUser, ip?: string) {
    const [customer, vehicle, product, helmet] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } }),
      this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, deletedAt: null } }),
      this.prisma.insuranceProduct.findFirst({ where: { id: dto.productId, isActive: true } }),
      dto.helmetId ? this.prisma.helmet.findFirst({ where: { id: dto.helmetId, deletedAt: null } }) : Promise.resolve(null),
    ]);
    if (!customer) throw new NotFoundException('Customer not found.');
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    if (!product) throw new NotFoundException('Insurance product not found.');
    if (vehicle.customerId !== customer.id) throw new BadRequestException('Vehicle does not belong to this customer.');
    if (dto.helmetId && (!helmet || helmet.customerId !== customer.id)) {
      throw new BadRequestException('Helmet does not belong to this customer.');
    }
    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : addMonths(start, product.durationMonths);
    if (end <= start) throw new BadRequestException('Policy end date must be after the start date.');
    try {
      const policy = await this.prisma.$transaction(async (tx) => {
        const policyNumber = await this.sequences.next('policy', 'POL', tx);
        return tx.insurancePolicy.create({
          data: {
            policyNumber,
            customerId: customer.id,
            vehicleId: vehicle.id,
            productId: product.id,
            helmetId: helmet?.id,
            status: dto.status ?? PolicyStatus.PENDING,
            startDate: start,
            endDate: end,
            premiumAmount: product.premiumAmount,
            coverageAmount: product.coverageAmount,
            isDemo: true,
          },
          include: policyInclude,
        });
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'CREATE',
        entity: 'insurance_policies',
        entityId: policy.id,
        ipAddress: ip,
        metadata: { policyNumber: policy.policyNumber },
      });
      return policy;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async update(id: string, dto: UpdatePolicyDto, actor: AuthUser, ip?: string) {
    await this.findOne(id, actor);
    const policy = await this.prisma.insurancePolicy.update({
      where: { id },
      data: { status: dto.status, endDate: dto.endDate ? new Date(dto.endDate) : undefined },
      include: policyInclude,
    });
    await this.audit.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entity: 'insurance_policies',
      entityId: id,
      ipAddress: ip,
      metadata: { status: dto.status },
    });
    return policy;
  }

  async listRenewals(actor: AuthUser) {
    const own = scopedCustomerId(actor);
    return this.prisma.renewalRequest.findMany({
      where: own ? { customerId: own } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        policy: { select: { id: true, policyNumber: true, status: true, endDate: true } },
        customer: { select: { id: true, fullName: true, customerCode: true } },
      },
    });
  }

  async requestRenewal(policyId: string, dto: CreateRenewalDto, actor: AuthUser, ip?: string) {
    const policy = await this.findOne(policyId, actor);
    if (policy.status === PolicyStatus.CANCELLED) {
      throw new BadRequestException('Cancelled policies cannot be renewed.');
    }
    const request = await this.prisma.renewalRequest.create({
      data: { policyId: policy.id, customerId: policy.customerId, note: dto.note.trim(), status: RenewalStatus.PENDING },
    });
    const [admins, customer] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null, status: 'ACTIVE', role: { name: { in: [RoleName.ADMIN, RoleName.SUPER_ADMIN] } } },
      }),
      this.prisma.customer.findUnique({ where: { id: policy.customerId } }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found.');
    await this.prisma.notification.createMany({
      data: [
        ...admins.map((admin) => ({
          userId: admin.id,
          title: 'Renewal request',
          message: `DEMO DATA: ${customer.fullName} requested renewal for ${policy.policyNumber}.`,
          channel: 'IN_APP' as const,
        })),
        {
          userId: customer.userId,
          title: 'Renewal request received',
          message: `DEMO DATA: we recorded your renewal request for ${policy.policyNumber}. No payment was taken.`,
          channel: 'IN_APP' as const,
        },
      ],
    });
    await this.audit.log({
      userId: actor.userId,
      action: 'CREATE',
      entity: 'renewal_requests',
      entityId: request.id,
      ipAddress: ip,
    });
    return request;
  }

  async updateRenewal(id: string, dto: UpdateRenewalDto, actor: AuthUser, ip?: string) {
    const request = await this.prisma.renewalRequest.findUnique({ where: { id }, include: { customer: true, policy: true } });
    if (!request) throw new NotFoundException('Renewal request not found.');
    const updated = await this.prisma.renewalRequest.update({ where: { id }, data: { status: dto.status } });
    await this.prisma.notification.create({
      data: {
        userId: request.customer.userId,
        title: 'Renewal update',
        message: `DEMO DATA: renewal for ${request.policy.policyNumber} is ${dto.status}.`,
        channel: 'IN_APP',
      },
    });
    await this.audit.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entity: 'renewal_requests',
      entityId: id,
      ipAddress: ip,
      metadata: { status: dto.status },
    });
    return updated;
  }

  async addDocument(
    policyId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    actor: AuthUser,
    ip?: string,
  ) {
    const policy = await this.findOne(policyId, actor);
    const upload = assertAllowedUpload(file);
    await mkdir(documentsDir(), { recursive: true });
    const storedName = `${randomUUID()}${extensionFor(upload.originalname, upload.mimetype)}`;
    await writeFile(documentAbsolute(storedName), upload.buffer);
    const doc = await this.prisma.policyDocument.create({
      data: { policyId: policy.id, fileName: upload.originalname, storedName, mimeType: upload.mimetype },
    });
    await this.audit.log({ userId: actor.userId, action: 'CREATE', entity: 'policy_documents', entityId: doc.id, ipAddress: ip });
    return doc;
  }

  async documentFile(policyId: string, docId: string, actor: AuthUser) {
    await this.findOne(policyId, actor);
    const doc = await this.prisma.policyDocument.findFirst({ where: { id: docId, policyId } });
    if (!doc) throw new NotFoundException('Document not found.');
    const full = documentAbsolute(doc.storedName);
    if (!existsSync(full)) throw new NotFoundException('Document file is missing.');
    return { stream: createReadStream(full), filename: doc.fileName, mimeType: doc.mimeType };
  }
}
