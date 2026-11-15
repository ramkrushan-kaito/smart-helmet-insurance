import { RoleName } from '@prisma/client';

export type AuthUser = {
  userId: string;
  role: RoleName;
  customerId: string | null;
  email: string | null;
  mobile: string | null;
  fullName: string;
};

export const userPublicSelect = {
  id: true,
  email: true,
  mobile: true,
  fullName: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true, description: true } },
} as const;
