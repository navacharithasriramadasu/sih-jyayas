import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { AiService } from '../ai/ai.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProduceService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private aiService: AiService,
    private httpService: HttpService,
  ) {}

  async create(farmerId: string, data: Omit<Prisma.ProduceInventoryCreateInput, 'farmer'>) {
    const produce = await this.prisma.produceInventory.create({
      data: {
        ...data,
        farmer: { connect: { id: farmerId } },
      },
    });

    try {
      // 1. Generate semantic embedding string (e.g. "Tomato Hybrid Roma 20.00 Maharashtra")
      const textToEmbed = `${data.crop_name} ${data.variety} ${data.expected_price_per_kg} ${data.pickup_address}`;
      const embeddingArray = await this.aiService.generateEmbedding(textToEmbed);
      
      // 2. Format as Postgres vector string '[0.1, 0.2, ...]'
      const vectorString = `[${embeddingArray.join(',')}]`;
      
      // 3. Update the unsupported vector field using raw SQL
      await this.prisma.$executeRawUnsafe(
        `UPDATE "ProduceInventory" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        produce.id
      );
    } catch (e) {
      console.error('Failed to generate embedding for produce:', e);
    }
    // 4. Fetch AI Dynamic Price Recommendation
    let aiPricingData = null;
    try {
      // The Python microservice must be running on port 8000
      const response = await firstValueFrom(
        this.httpService.get(`http://localhost:8000/api/v1/ai/price-recommendation`, {
          params: {
            crop: data.crop_name,
            quantity_kg: Number(data.total_quantity_kg),
            mandi_price: Number(data.expected_price_per_kg)
          }
        })
      );
      aiPricingData = response.data?.data;
    } catch (e) {
      console.warn('AI Python microservice unreachable or failed. Falling back to default.', e.message);
    }
    
    // Broadcast instantly to all connected buyers!
    this.eventsGateway.server.emit('produce.created', {
      ...produce,
      ai_pricing: aiPricingData
    });
    
    return produce;
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
