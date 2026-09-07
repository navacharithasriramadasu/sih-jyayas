import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProduceService {
  constructor(private prisma: PrismaService) {}

  async create(farmerId: string, data: Omit<Prisma.ProduceInventoryCreateInput, 'farmer'>) {
    return this.prisma.produceInventory.create({
      data: {
        ...data,
        farmer: { connect: { id: farmerId } },
      },
    });
  }

  async findAllByFarmer(farmerId: string) {
    return this.prisma.produceInventory.findMany({
      where: { farmer_id: farmerId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllAvailable() {
    return this.prisma.produceInventory.findMany({
      where: { status: 'available' },
      include: { farmer: { select: { full_name: true, phone_number: true } } },
    });
  }
}
