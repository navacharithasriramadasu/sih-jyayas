import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RequirementsService {
  constructor(private prisma: PrismaService) {}

  async create(buyerId: string, data: Omit<Prisma.BuyerRequirementCreateInput, 'buyer'>) {
    return this.prisma.buyerRequirement.create({
      data: {
        ...data,
        buyer: { connect: { id: buyerId } },
      },
    });
  }

  async findAllByBuyer(buyerId: string) {
    return this.prisma.buyerRequirement.findMany({
      where: { buyer_id: buyerId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllOpen() {
    return this.prisma.buyerRequirement.findMany({
      where: { status: 'open' },
      include: { buyer: { select: { full_name: true, phone_number: true } } },
    });
  }
}
