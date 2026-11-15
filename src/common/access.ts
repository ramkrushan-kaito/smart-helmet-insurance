import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuthUser } from './types';

export function assertOwnsCustomer(actor: AuthUser, customerId: string) {
  if (actor.role === RoleName.CUSTOMER && actor.customerId !== customerId) {
    throw new ForbiddenException('You can only access your own records.');
  }
}

export function scopedCustomerId(actor: AuthUser): string | undefined {
  if (actor.role !== RoleName.CUSTOMER) return undefined;
  if (!actor.customerId) throw new ForbiddenException('Customer profile is missing.');
  return actor.customerId;
}
