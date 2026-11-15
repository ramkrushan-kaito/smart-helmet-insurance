import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowPrisma(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
    throw new ConflictException(`A record with this ${target} already exists.`);
  }
  throw error;
}
