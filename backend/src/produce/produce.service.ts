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
    let qualityGrade = Prisma.QualityGrade.pending;
    let qualityScore = 85.0; // default fallback

    // --- CV Module 4 Integration ---
    if (data.images && data.images.length >= 3) {
      try {
        const cvResponse = await firstValueFrom(
          this.httpService.post(`http://localhost:8001/api/v1/cv/grade`, {
            images: data.images,
            crop_type: "perishable" // Simplification for MVP
          })
        );
        const cvData = cvResponse.data;
        if (cvData && cvData.grade) {
          qualityGrade = cvData.grade === 'A' ? Prisma.QualityGrade.gradeA : 
                         cvData.grade === 'B' ? Prisma.QualityGrade.gradeB : 
                         Prisma.QualityGrade.gradeC;
          // E.g., 100 - (100 * (average_defect / 100))
          qualityScore = Math.max(0, 100 - (cvData.average_defect_percentage * 2));
        }
      } catch (e) {
        console.warn('Failed to reach Python CV Engine. Proceeding with pending grade.', e.message);
      }
    }

    const produce = await this.prisma.produceInventory.create({
      data: {
        ...data,
        quality_grade: qualityGrade,
        quality_score: qualityScore,
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
