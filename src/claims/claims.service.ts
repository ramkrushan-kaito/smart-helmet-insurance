import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaimStatus, PolicyStatus, Prisma } from '@prisma/client';
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
import { ClaimQueryDto, CreateClaimDto, UpdateClaimStatusDto } from './dto';

const claimInclude = {
  policy: { include: { product: true, vehicle: true } },
  customer: { select: { id: true, fullName: true, customerCode: true, userId: true } },
  documents: true,
} satisfies Prisma.InsuranceClaimInclude;

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ClaimQueryDto, actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const own = scopedCustomerId(actor);
    const where: Prisma.InsuranceClaimWhereInput = {
      status: query.status,
      policyId: query.policyId,
      customerId: own,
      ...(search
        ? {
            OR: [
              { claimNumber: { contains: search, mode: 'insensitive' } },
              { customer: { fullName: { contains: search, mode: 'insensitive' } } },
              { policy: { policyNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sort = sortField(query.sort, ['createdAt', 'claimNumber', 'status', 'claimAmount'], 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({ where, skip, take, orderBy: { [sort]: query.order ?? 'desc' }, include: claimInclude }),
      this.prisma.insuranceClaim.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id }, include: claimInclude });
    if (!claim) throw new NotFoundException('Claim not found.');
    assertOwnsCustomer(actor, claim.customerId);
    return claim;
  }

  async create(dto: CreateClaimDto, actor: AuthUser, ip?: string) {
    const policy = await this.prisma.insurancePolicy.findFirst({
      where: { id: dto.policyId, deletedAt: null },
      include: { customer: true },
    });
    if (!policy) throw new NotFoundException('Policy not found.');
    assertOwnsCustomer(actor, policy.customerId);
    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new BadRequestException('Claims can only be submitted on an active policy.');
    }
    const incident = new Date(dto.incidentDate);
    if (incident.getTime() > Date.now()) throw new BadRequestException('Incident date cannot be in the future.');
    if (dto.claimAmount > Number(policy.coverageAmount)) {
      throw new BadRequestException('Claim amount exceeds policy coverage.');
    }
    try {
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
            status: ClaimStatus.SUBMITTED,
            isDemo: true,
          },
          include: claimInclude,
        });
      });
      await this.prisma.notification.create({
        data: {
          userId: policy.customer.userId,
          title: 'Claim submitted',
          message: `DEMO DATA: claim ${claim.claimNumber} was submitted. No payment has been made.`,
          channel: 'IN_APP',
        },
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'CREATE',
        entity: 'insurance_claims',
        entityId: claim.id,
        ipAddress: ip,
        metadata: { claimNumber: claim.claimNumber },
      });
      return claim;
    } catch (error) {
      rethrowPrisma(error);
    }
  }

  async updateStatus(id: string, dto: UpdateClaimStatusDto, actor: AuthUser, ip?: string) {
    const existing = await this.findOne(id, actor);
    if (dto.status === ClaimStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }
    const claim = await this.prisma.insuranceClaim.update({
      where: { id },
      data: {
        status: dto.status,
        approvedAmount: dto.approvedAmount,
        rejectionReason: dto.status === ClaimStatus.REJECTED ? dto.rejectionReason?.trim() : dto.rejectionReason,
      },
      include: claimInclude,
    });
    await this.prisma.notification.create({
      data: {
        userId: existing.customer.userId,
        title: 'Claim status updated',
        message: `DEMO DATA: claim ${existing.claimNumber} is now ${dto.status}.`,
        channel: 'IN_APP',
      },
    });
    await this.audit.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entity: 'insurance_claims',
      entityId: id,
      ipAddress: ip,
      metadata: { status: dto.status },
    });
    return claim;
  }

  async addDocument(
    claimId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    actor: AuthUser,
    ip?: string,
  ) {
    const claim = await this.findOne(claimId, actor);
    const upload = assertAllowedUpload(file);
    await mkdir(documentsDir(), { recursive: true });
    const storedName = `${randomUUID()}${extensionFor(upload.originalname, upload.mimetype)}`;
    await writeFile(documentAbsolute(storedName), upload.buffer);
    const doc = await this.prisma.claimDocument.create({
      data: { claimId: claim.id, fileName: upload.originalname, storedName, mimeType: upload.mimetype },
    });
    await this.audit.log({ userId: actor.userId, action: 'CREATE', entity: 'claim_documents', entityId: doc.id, ipAddress: ip });
    return doc;
  }

  async documentFile(claimId: string, docId: string, actor: AuthUser) {
    await this.findOne(claimId, actor);
    const doc = await this.prisma.claimDocument.findFirst({ where: { id: docId, claimId } });
    if (!doc) throw new NotFoundException('Document not found.');
    const full = documentAbsolute(doc.storedName);
    if (!existsSync(full)) throw new NotFoundException('Document file is missing.');
    return { stream: createReadStream(full), filename: doc.fileName, mimeType: doc.mimeType };
  }
}
