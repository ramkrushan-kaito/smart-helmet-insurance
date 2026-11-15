import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  next(name: string, prefix: string, tx?: Prisma.TransactionClient) {
    if (tx) return this.allocate(tx, name, prefix);
    return this.prisma.$transaction((inner) => this.allocate(inner, name, prefix));
  }

  private async allocate(db: Db, name: string, prefix: string) {
    await db.sequence.upsert({
      where: { name },
      update: {},
      create: { name, value: 10000 },
    });
    const row = await db.sequence.update({
      where: { name },
      data: { value: { increment: 1 } },
    });
    return `${prefix}${row.value}`;
  }
}
