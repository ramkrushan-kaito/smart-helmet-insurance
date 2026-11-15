import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma.service';
import { AuthUser } from '../common/types';

function countBy(rows: Array<{ status: string; _count: number | { _all: number } }>) {
  return Object.fromEntries(rows.map((row) => [row.status, typeof row._count === 'number' ? row._count : row._count._all]));
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get('admin')
  async admin() {
    const [customers, helmets, vehicles, unassigned, policyRows, claimRows, qrRows, paymentSum, recentClaims] =
      await Promise.all([
        this.prisma.customer.count({ where: { deletedAt: null } }),
        this.prisma.helmet.count({ where: { deletedAt: null } }),
        this.prisma.vehicle.count({ where: { deletedAt: null } }),
        this.prisma.helmet.count({ where: { deletedAt: null, status: 'UNASSIGNED' } }),
        this.prisma.insurancePolicy.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
        this.prisma.insuranceClaim.groupBy({ by: ['status'], _count: true }),
        this.prisma.helmetQrCode.groupBy({ by: ['status'], _count: true }),
        this.prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: true }),
        this.prisma.insuranceClaim.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { fullName: true } }, policy: { select: { policyNumber: true } } },
        }),
      ]);
    return {
      customers,
      helmets,
      vehicles,
      unassignedHelmets: unassigned,
      policiesByStatus: countBy(policyRows as Array<{ status: string; _count: number }>),
      claimsByStatus: countBy(claimRows as Array<{ status: string; _count: number }>),
      qrByStatus: countBy(qrRows as Array<{ status: string; _count: number }>),
      successfulPayments: paymentSum._count,
      successfulPaymentAmount: paymentSum._sum.amount ?? 0,
      recentClaims,
    };
  }

  @Roles(RoleName.CUSTOMER)
  @Get('customer')
  async customer(@CurrentUser() actor: AuthUser) {
    const customerId = actor.customerId;
    if (!customerId) return { helmets: 0, vehicles: 0, policies: 0, openClaims: 0, unreadNotifications: 0 };
    const [helmets, vehicles, policies, openClaims, unreadNotifications, recentPolicies] = await Promise.all([
      this.prisma.helmet.count({ where: { customerId, deletedAt: null } }),
      this.prisma.vehicle.count({ where: { customerId, deletedAt: null } }),
      this.prisma.insurancePolicy.count({ where: { customerId, deletedAt: null } }),
      this.prisma.insuranceClaim.count({
        where: { customerId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } },
      }),
      this.prisma.notification.count({ where: { userId: actor.userId, isRead: false } }),
      this.prisma.insurancePolicy.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { product: true, vehicle: true },
      }),
    ]);
    return { helmets, vehicles, policies, openClaims, unreadNotifications, recentPolicies };
  }
}
