import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { AiService } from '../ai/ai.service';

@Injectable()
export class RequirementsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private aiService: AiService,
  ) {}

  async create(buyerId: string, data: Omit<Prisma.BuyerRequirementCreateInput, 'buyer'>) {
    const requirement = await this.prisma.buyerRequirement.create({
      data: {
        ...data,
        buyer: { connect: { id: buyerId } },
      },
    });

    try {
      // 1. Generate semantic embedding
      const textToEmbed = `${data.crop_name} ${data.variety || ''} ${data.target_price_max} ${data.delivery_address}`;
      const embeddingArray = await this.aiService.generateEmbedding(textToEmbed);
      
      // 2. Format and update via raw SQL
      const vectorString = `[${embeddingArray.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `UPDATE "BuyerRequirement" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        requirement.id
      );
    } catch (e) {
      console.error('Failed to generate embedding for requirement:', e);
    }
    
    // Broadcast requirement to everyone (farmers looking for buyers)
    this.eventsGateway.server.emit('requirement.created', requirement);
    
    return requirement;
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
