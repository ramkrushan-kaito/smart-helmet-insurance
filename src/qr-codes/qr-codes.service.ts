import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolicyStatus, Prisma, QrStatus, RoleName } from '@prisma/client';
import { randomBytes } from 'crypto';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import QRCode from 'qrcode';
import { basename } from 'path';
import { AuditService } from '../audit-logs/audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { qrAbsolute, qrDir } from '../common/files';
import { pageArgs, pageResult, sortField } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import { AuthUser } from '../common/types';
import { GenerateQrDto, ScanBuyDto, ScanClaimDto, UpdateQrStatusDto } from './dto';
import { extractQrToken, isWellFormedToken, maskMobile, resolveQrLookup } from './qr-token.util';
import { IsEnum, IsOptional } from 'class-validator';

export class QrQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(QrStatus)
  status?: QrStatus;
}

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly sequences: SequenceService,
  ) {}

  async list(query: QrQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.HelmetQrCodeWhereInput = {
      status: query.status,
      helmet: { deletedAt: null },
      ...(search
        ? {
            OR: [
              { token: { contains: search } },
              { helmet: { helmetCode: { contains: search, mode: 'insensitive' } } },
              { helmet: { brand: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'status', 'scanCount'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.helmetQrCode.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: query.order ?? 'desc' },
        include: { helmet: { select: { id: true, helmetCode: true, brand: true, model: true, status: true, customerId: true } } },
      }),
      this.prisma.helmetQrCode.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const qr = await this.prisma.helmetQrCode.findUnique({
      where: { id },
      include: { helmet: true },
    });
    if (!qr || qr.helmet.deletedAt) throw new NotFoundException('QR code not found.');
    if (actor.role === RoleName.CUSTOMER && qr.helmet.customerId !== actor.customerId) {
      throw new ForbiddenException('You can only access your own records.');
    }
    return qr;
  }

  async generate(dto: GenerateQrDto, actor: AuthUser, ip?: string) {
    const helmet = await this.prisma.helmet.findFirst({ where: { id: dto.helmetId, deletedAt: null } });
    if (!helmet) throw new NotFoundException('Helmet not found.');
    const existing = await this.prisma.helmetQrCode.findUnique({ where: { helmetId: helmet.id } });
    if (existing && !dto.reissue) return { ...existing, alreadyExists: true };
    if (existing && dto.reissue && actor.role !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super admin can reissue a QR code.');
    }
    const token = randomBytes(24).toString('base64url');
    const scanUrl = `${this.baseUrl()}/scan/${token}`;
    const imagePath = await this.writeImage(token, scanUrl);
    const saved = existing
      ? await this.prisma.helmetQrCode.update({
          where: { id: existing.id },
          data: {
            token,
            scanUrl,
            imagePath,
            status: 'ACTIVE',
            revokedAt: null,
            revokedReason: null,
            generatedAt: new Date(),
            expiresAt: null,
          },
        })
      : await this.prisma.helmetQrCode.create({
          data: { helmetId: helmet.id, token, scanUrl, imagePath, status: 'ACTIVE' },
        });
    if (existing?.imagePath) await rm(qrAbsolute(existing.imagePath), { force: true });
    await this.audit.log({
      userId: actor.userId,
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'helmet_qr_codes',
      entityId: saved.id,
      ipAddress: ip,
      metadata: { helmetCode: helmet.helmetCode, reissue: Boolean(dto.reissue) },
    });
    return saved;
  }

  async scan(rawToken: string, ip?: string) {
    const token = extractQrToken(rawToken);
    const record = isWellFormedToken(token)
      ? await this.prisma.helmetQrCode.findUnique({
          where: { token },
          include: {
            helmet: {
              include: {
                customer: true,
                vehicleMapping: { include: { vehicle: true } },
                policies: {
                  where: { deletedAt: null },
                  include: {
                    product: true,
                    claims: {
                      orderBy: { createdAt: 'desc' },
                      take: 5,
                      select: { claimNumber: true, status: true, claimAmount: true, incidentDate: true },
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        })
      : null;
    const decision = resolveQrLookup({
      token: rawToken,
      record: record
        ? {
            status: record.status,
            expiresAt: record.expiresAt,
            helmet: record.helmet
              ? {
                  deletedAt: record.helmet.deletedAt,
                  status: record.helmet.status,
                  customerId: record.helmet.customerId,
                }
              : null,
          }
        : null,
    });
    if (record) {
      await this.prisma.helmetQrCode.update({
        where: { id: record.id },
        data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
      });
    }
    await this.audit.log({
      action: 'SCAN',
      entity: 'helmet_qr_codes',
      entityId: record?.id,
      ipAddress: ip,
      metadata: { httpStatus: decision.httpStatus },
    });
    if (!decision.valid || !record?.helmet) {
      throw new HttpException(decision.message, decision.httpStatus);
    }
    const policies = record.helmet.policies.map((policy) => ({
      policyNumber: policy.policyNumber,
      status: policy.status,
      productName: policy.product.name,
      startDate: policy.startDate,
      endDate: policy.endDate,
      premiumAmount: policy.premiumAmount.toString(),
      coverageAmount: policy.coverageAmount.toString(),
      claims: policy.claims.map((claim) => ({
        claimNumber: claim.claimNumber,
        status: claim.status,
        claimAmount: claim.claimAmount.toString(),
        incidentDate: claim.incidentDate,
      })),
    }));
    const assigned = !decision.unassigned;
    const vehicle = record.helmet.vehicleMapping?.vehicle ?? null;
    const offers =
      assigned && vehicle
        ? await this.prisma.insuranceProduct.findMany({
            where: { isActive: true },
            orderBy: { premiumAmount: 'asc' },
            select: { id: true, name: true, premiumAmount: true, coverageAmount: true, durationMonths: true },
          })
        : [];
    return {
      valid: true,
      assigned,
      message: decision.message,
      helmet: {
        id: record.helmet.id,
        helmetCode: record.helmet.helmetCode,
        brand: record.helmet.brand,
        model: record.helmet.model,
        color: record.helmet.color,
        size: record.helmet.size,
        status: record.helmet.status,
      },
      customer: assigned
        ? { fullName: record.helmet.customer?.fullName ?? null, mobileMasked: maskMobile(record.helmet.customer?.mobile) }
        : null,
      vehicle: vehicle
        ? {
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
            type: vehicle.type,
          }
        : null,
      policy: policies[0] ?? null,
      policies,
      offers: offers.map((product) => ({
        id: product.id,
        name: product.name,
        premiumAmount: product.premiumAmount.toString(),
        coverageAmount: product.coverageAmount.toString(),
        durationMonths: product.durationMonths,
      })),
    };
  }

  async claimFromScan(dto: ScanClaimDto, ip?: string) {
    const helmet = await this.assignedHelmet(dto.token);
    const policy = helmet.policies.find((item) => item.status === PolicyStatus.ACTIVE);
    if (!policy) throw new BadRequestException('Claims can only be submitted on an active policy.');
    const incident = new Date(dto.incidentDate);
    if (incident.getTime() > Date.now()) throw new BadRequestException('Incident date cannot be in the future.');
    if (dto.claimAmount > Number(policy.coverageAmount)) {
      throw new BadRequestException('Claim amount exceeds policy coverage.');
    }
    const claim = await this.prisma.$transaction(async (tx) => {
      const claimNumber = await this.sequences.next('claim', 'CLM', tx);
      return tx.insuranceClaim.create({
        data: {
          claimNumber,
          policyId: policy.id,
          customerId: policy.customerId,
          incidentDate: incident,
          description: dto.description.trim(),
          claimAmount: dto.claimAmount,
          status: 'SUBMITTED',
          isDemo: true,
        },
      });
    });
    if (helmet.customer?.userId) {
      await this.prisma.notification.create({
        data: {
          userId: helmet.customer.userId,
          title: 'Claim submitted',
          message: `DEMO DATA: claim ${claim.claimNumber} was submitted from a QR scan. No payment has been made.`,
          channel: 'IN_APP',
        },
      });
    }
    await this.audit.log({
      action: 'CREATE',
      entity: 'insurance_claims',
      entityId: claim.id,
      ipAddress: ip,
      metadata: { claimNumber: claim.claimNumber, source: 'qr-scan' },
    });
    return {
      claimNumber: claim.claimNumber,
      status: claim.status,
      message: `Claim ${claim.claimNumber} submitted on ${policy.policyNumber}. This is demo data. No payment was made.`,
    };
  }

  async buyFromScan(dto: ScanBuyDto, ip?: string) {
    const helmet = await this.assignedHelmet(dto.token);
    const vehicle = helmet.vehicleMapping?.vehicle;
    if (!helmet.customer || !vehicle) {
      throw new BadRequestException('This helmet needs an assigned customer and vehicle before a policy can be bought.');
    }
    const product = await this.prisma.insuranceProduct.findFirst({ where: { id: dto.productId, isActive: true } });
    if (!product) throw new NotFoundException('Insurance product not found.');
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + product.durationMonths);
    const policy = await this.prisma.$transaction(async (tx) => {
      const policyNumber = await this.sequences.next('policy', 'POL', tx);
      const created = await tx.insurancePolicy.create({
        data: {
          policyNumber,
          customerId: helmet.customer!.id,
          vehicleId: vehicle.id,
          productId: product.id,
          helmetId: helmet.id,
          status: PolicyStatus.ACTIVE,
          startDate: start,
          endDate: end,
          premiumAmount: product.premiumAmount,
          coverageAmount: product.coverageAmount,
          isDemo: true,
        },
      });
      const paymentRef = await this.sequences.next('payment', 'PAY', tx);
      await tx.payment.create({
        data: {
          paymentRef,
          customerId: helmet.customer!.id,
          policyId: created.id,
          amount: product.premiumAmount,
          purpose: 'PREMIUM',
          status: 'SUCCESS',
          method: 'DEMO_UPI',
          isDemo: true,
          paidAt: new Date(),
        },
      });
      return created;
    });
    await this.prisma.notification.create({
      data: {
        userId: helmet.customer.userId,
        title: 'Demo policy purchased',
        message: `DEMO DATA: ${policy.policyNumber} was purchased from a QR scan. No money was collected.`,
        channel: 'IN_APP',
      },
    });
    await this.audit.log({
      action: 'CREATE',
      entity: 'insurance_policies',
      entityId: policy.id,
      ipAddress: ip,
      metadata: { policyNumber: policy.policyNumber, source: 'qr-scan' },
    });
    return {
      policyNumber: policy.policyNumber,
      status: policy.status,
      message: `Policy ${policy.policyNumber} is active. Demo purchase only. No money was collected.`,
    };
  }

  private async assignedHelmet(rawToken: string) {
    const token = extractQrToken(rawToken);
    const record = isWellFormedToken(token)
      ? await this.prisma.helmetQrCode.findUnique({
          where: { token },
          include: {
            helmet: {
              include: {
                customer: true,
                vehicleMapping: { include: { vehicle: true } },
                policies: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
              },
            },
          },
        })
      : null;
    const decision = resolveQrLookup({
      token: rawToken,
      record: record
        ? {
            status: record.status,
            expiresAt: record.expiresAt,
            helmet: record.helmet
              ? { deletedAt: record.helmet.deletedAt, status: record.helmet.status, customerId: record.helmet.customerId }
              : null,
          }
        : null,
    });
    if (!decision.valid || !record?.helmet) throw new HttpException(decision.message, decision.httpStatus);
    if (decision.unassigned || !record.helmet.customer) {
      throw new BadRequestException('This helmet is not yet assigned to a customer.');
    }
    return record.helmet;
  }

  async updateStatus(id: string, dto: UpdateQrStatusDto, actor: AuthUser, ip?: string) {
    const qr = await this.prisma.helmetQrCode.findUnique({ where: { id } });
    if (!qr) throw new NotFoundException('QR code not found.');
    const updated = await this.prisma.helmetQrCode.update({
      where: { id },
      data: {
        status: dto.status,
        revokedAt: dto.status === 'REVOKED' ? new Date() : null,
        revokedReason: dto.status === 'REVOKED' ? dto.reason ?? 'Revoked by administrator' : null,
      },
    });
    await this.audit.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entity: 'helmet_qr_codes',
      entityId: id,
      ipAddress: ip,
      metadata: { status: dto.status },
    });
    return updated;
  }

  async image(id: string, actor: AuthUser, ip?: string) {
    const qr = await this.findOne(id, actor);
    if (!qr.imagePath) throw new NotFoundException('QR image not found. Generate it again.');
    const full = qrAbsolute(qr.imagePath);
    if (!existsSync(full)) throw new NotFoundException('QR image file is missing. Generate it again.');
    await this.audit.log({
      userId: actor.userId,
      action: 'DOWNLOAD',
      entity: 'helmet_qr_codes',
      entityId: id,
      ipAddress: ip,
    });
    return { full, filename: `${qr.helmet.helmetCode}.png` };
  }

  private baseUrl() {
    const url = this.config.get<string>('QR_PUBLIC_BASE_URL')?.replace(/\/$/, '');
    if (!url) throw new HttpException('QR_PUBLIC_BASE_URL is not configured.', 500);
    return url;
  }

  private async writeImage(token: string, scanUrl: string) {
    const dir = qrDir();
    await mkdir(dir, { recursive: true });
    const filename = `${basename(token)}.png`;
    await writeFile(qrAbsolute(filename), await QRCode.toBuffer(scanUrl, { width: 512, margin: 2, errorCorrectionLevel: 'M' }));
    return filename;
  }
}
