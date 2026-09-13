import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, QualityGrade, DraftStatus } from '@prisma/client';
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

  async assessQuality(farmerId: string, images: string[], cropType: string = 'perishable') {
    if (!images || images.length === 0) {
      throw new Error("At least one image is required for assessment.");
    }

    let qualityGrade = QualityGrade.pending;
    let qualityScore = 85.0; // fallback
    let confidenceScore = 90.0;

    try {
      const aiServiceUrl = process.env.CV_AI_SERVICE_URL || 'http://localhost:8001';
      const cvResponse = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/v1/cv/grade`, {
          images,
          crop_type: cropType
        })
      );
      
      const cvData = cvResponse.data;
      if (cvData && cvData.grade) {
        qualityGrade = cvData.grade === 'A' ? QualityGrade.gradeA : 
                       cvData.grade === 'B' ? QualityGrade.gradeB : 
                       QualityGrade.gradeC;
        qualityScore = Math.max(0, 100 - (cvData.average_defect_percentage * 2));
      }
    } catch (e) {
      console.warn('Failed to reach Python CV Engine for assessment. Using fallback.', e.message);
    }

    // Save intermediate draft in DB
    const draft = await this.prisma.qualityAssessmentDraft.create({
      data: {
        farmer_id: farmerId,
        crop_type: cropType,
        images,
        predicted_grade: qualityGrade,
        quality_score: qualityScore,
        confidence_score: confidenceScore,
        status: DraftStatus.draft
      }
    });

    return draft;
  }

  async create(farmerId: string, data: Omit<Prisma.ProduceInventoryCreateInput, 'farmer'>) {
    let qualityGrade = QualityGrade.pending;
    let qualityScore = 85.0; // default fallback

    // If assessment_id is provided, pull the grade from the draft
    if (data.assessment_id) {
      const draft = await this.prisma.qualityAssessmentDraft.findUnique({
        where: { id: data.assessment_id }
      });
      if (draft && draft.farmer_id === farmerId) {
        qualityGrade = draft.predicted_grade;
        qualityScore = Number(draft.quality_score);
        data.images = draft.images; // inherit images
        
        // Mark draft as listed
        await this.prisma.qualityAssessmentDraft.update({
          where: { id: draft.id },
          data: { status: DraftStatus.listed }
        });
      }
    } else if (data.images && Array.isArray(data.images) && data.images.length >= 3) {
      // Legacy flow without explicit assessment drafting
      try {
        const aiServiceUrl = process.env.CV_AI_SERVICE_URL || 'http://localhost:8001';
        const cvResponse = await firstValueFrom(
          this.httpService.post(`${aiServiceUrl}/api/v1/cv/grade`, {
            images: data.images,
            crop_type: "perishable" // Simplification for MVP
          })
        );
        const cvData = cvResponse.data;
        if (cvData && cvData.grade) {
          qualityGrade = cvData.grade === 'A' ? QualityGrade.gradeA : 
                         cvData.grade === 'B' ? QualityGrade.gradeB : 
                         QualityGrade.gradeC;
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
