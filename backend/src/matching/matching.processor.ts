import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Processor('matching')
export class MatchingProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing matching job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case 'match-buyer':
        return this.processBuyerMatch(job.data);
      case 'match-farmer':
        return this.processFarmerMatch(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async processBuyerMatch(data: any) {
    console.log(`Executing AI vector match for buyer req: ${data.requirementId}`);
    
    // 1. Fetch the Buyer Requirement and its embedding vector
    const req = await this.prisma.buyerRequirement.findUnique({
      where: { id: data.requirementId }
    });
    if (!req) return { success: false, error: 'Requirement not found' };

    // 2. Perform Cosine Similarity Search using pgvector (<=>) + earthdistance in raw Postgres SQL
    // We want to find ProduceInventory where:
    // - status is 'available'
    // - crop_name matches
    // - distance is within 100km
    // - ORDER BY cosine similarity (embedding <=> req.embedding) + distance penalty
    
    const matches = await this.prisma.$queryRawUnsafe(`
      SELECT 
        p.id, 
        p.crop_name, 
        p.expected_price_per_kg,
        p.available_quantity_kg,
        (p.embedding <=> r.embedding) AS ai_distance,
        (earth_distance(ll_to_earth(p.pickup_latitude, p.pickup_longitude), ll_to_earth(r.delivery_latitude, r.delivery_longitude)) / 1000) AS distance_km
      FROM "ProduceInventory" p
      JOIN "BuyerRequirement" r ON r.id = $1
      WHERE p.status = 'available'
        AND p.crop_name = r.crop_name
        AND (earth_distance(ll_to_earth(p.pickup_latitude, p.pickup_longitude), ll_to_earth(r.delivery_latitude, r.delivery_longitude)) / 1000) <= 100
      ORDER BY ai_distance ASC, distance_km ASC
      LIMIT 10;
    `, req.id);

    console.log(`Found ${Array.isArray(matches) ? matches.length : 0} semantic matches for ${req.id}`);
    
    // Broadcast instantly to the specific buyer's room
    if (data.buyerId) {
      this.eventsGateway.alertBuyerMatch(data.buyerId, { 
        requirementId: data.requirementId, 
        newMatchesFound: true,
        matches: matches
      });
    }
    
    return { success: true };
  }

  private async processFarmerMatch(data: any) {
    console.log(`Executing matching for newly listed produce: ${data.produceId}`);
    return { success: true };
  }
}
