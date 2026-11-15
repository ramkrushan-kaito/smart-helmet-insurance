import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit-logs/audit.service';
import { scopedCustomerId } from '../common/access';
import { pageArgs, pageResult } from '../common/pagination';
import { rethrowPrisma } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import { AuthUser } from '../common/types';
import { CreatePaymentDto, PaymentQueryDto } from './dto';

const allowedMethods = new Set(['DEMO_UPI', 'DEMO_CARD', 'DEMO_NETBANKING']);

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaymentQueryDto, actor: AuthUser) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const own = scopedCustomerId(actor);
    const where: Prisma.PaymentWhereInput = { status: query.status, customerId: own };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: query.order ?? 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, customerCode: true } },
          policy: { select: { id: true, policyNumber: true } },
          claim: { select: { id: true, claimNumber: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return pageResult(data, total, page, limit);
  }

  async create(dto: CreatePaymentDto, actor: AuthUser, ip?: string) {
    if (!allowedMethods.has(dto.method)) {
      throw new BadRequestException('Use a demo method: DEMO_UPI, DEMO_CARD or DEMO_NETBANKING.');
    }
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found.');
    if (dto.policyId) {
      const policy = await this.prisma.insurancePolicy.findFirst({ where: { id: dto.policyId, deletedAt: null } });
      if (!policy || policy.customerId !== customer.id) throw new BadRequestException('Policy does not belong to this customer.');
    }
    if (dto.claimId) {
      const claim = await this.prisma.insuranceClaim.findUnique({ where: { id: dto.claimId } });
      if (!claim || claim.customerId !== customer.id) throw new BadRequestException('Claim does not belong to this customer.');
    }
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const paymentRef = await this.sequences.next('payment', 'PAY', tx);
        return tx.payment.create({
          data: {
            paymentRef,
            customerId: customer.id,
            policyId: dto.policyId,
            claimId: dto.claimId,
            amount: dto.amount,
            purpose: dto.purpose,
            status: dto.status,
            method: dto.method,
            isDemo: true,
            paidAt: dto.status === 'SUCCESS' ? new Date() : null,
          },
        });
      });
      await this.prisma.notification.create({
        data: {
          userId: customer.userId,
          title: 'Demo payment recorded',
          message: `DEMO DATA: ${payment.paymentRef} for ${dto.amount} was recorded as ${dto.status}. No money was collected.`,
          channel: 'IN_APP',
        },
      });
      await this.audit.log({
        userId: actor.userId,
        action: 'CREATE',
        entity: 'payments',
        entityId: payment.id,
        ipAddress: ip,
        metadata: { paymentRef: payment.paymentRef, demo: true },
      });
      return payment;
    } catch (error) {
      rethrowPrisma(error);
    }
  }
}
