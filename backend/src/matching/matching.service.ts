import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FindMatchesDto } from './dto/find-matches.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('matching') private matchingQueue: Queue,
  ) {}

  async findMatches(dto: FindMatchesDto) {
    const { crop, quantity_kg, grade, max_distance_km = 50, lat, lng } = dto;

    // Dispatch background job for heavy background processing (as per architecture)
    await this.matchingQueue.add('match-buyer', {
      crop,
      quantity_kg,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });

    // For immediate demo response, we also run the raw SQL synchronously
    const radiusMeters = max_distance_km * 1000;

    // 1. & 2. Fetch available supply and do Spatial Filtering using earthdistance
    // Postgres earthdistance returns distance in meters.
    const availableProduce: any[] = await this.prisma.$queryRaw`
      SELECT 
        p.*,
        u.full_name as farmer_name,
        earth_distance(
          ll_to_earth(${lat}::float8, ${lng}::float8), 
          ll_to_earth(p.pickup_latitude::float8, p.pickup_longitude::float8)
        ) as distance_meters
      FROM "ProduceInventory" p
      JOIN "User" u ON p.farmer_id = u.id
      WHERE p.crop_name = ${crop}
      AND p.status = 'available'
      ${grade ? this.prisma.$queryRaw`AND p.quality_grade = ${grade}` : this.prisma.$queryRaw``}
      AND earth_distance(
        ll_to_earth(${lat}::float8, ${lng}::float8), 
        ll_to_earth(p.pickup_latitude::float8, p.pickup_longitude::float8)
      ) <= ${radiusMeters}
      ORDER BY distance_meters ASC, p.expected_price_per_kg ASC
    `;

    // 3. Aggregation Logic (Generate multiple potential matches)
    const matches = [];
    
    for (let i = 0; i < availableProduce.length; i++) {
      const currentMatchContributors = [];
      let currentQty = 0;
      let totalValue = 0;
      let totalQualityScore = 0;
      let totalDistanceKm = 0;
      let totalConfidence = 0;

      for (let j = i; j < availableProduce.length; j++) {
        const lot = availableProduce[j];
        
        const remainingNeeded = quantity_kg - currentQty;
        if (remainingNeeded <= 0) break;

        const lotAvailable = Number(lot.available_quantity_kg);
        const takeQty = Math.min(lotAvailable, remainingNeeded);
        const lotPrice = Number(lot.expected_price_per_kg);
        const distanceKm = Number(lot.distance_meters) / 1000;
        
        currentMatchContributors.push({
          farmer_id: lot.farmer_id,
          farmer_name: lot.farmer_name,
          produce_id: lot.id,
          quantity_kg: takeQty,
          price_per_kg: lotPrice,
          payout_amount: takeQty * lotPrice,
          location: lot.pickup_address,
          distance_to_hub_km: Number(distanceKm.toFixed(2)),
        });

        currentQty += takeQty;
        totalValue += takeQty * lotPrice;
        totalQualityScore += Number(lot.quality_score) * takeQty;
        totalConfidence += Number(lot.confidence_score) * takeQty;
        totalDistanceKm += distanceKm;

        if (currentQty >= quantity_kg) {
          const avgPrice = totalValue / quantity_kg;
          const avgQuality = totalQualityScore / quantity_kg;
          const avgConfidence = totalConfidence / quantity_kg;
          const avgDistance = totalDistanceKm / currentMatchContributors.length;
          
          // --- 40:40:20 Matching Engine Logic ---
          // 1. Quality (40% Weight): Driven heavily by the Python CV AI Grade
          const qualityScoreWeighted = (avgQuality / 100) * 40;
          
          // 2. Price (40% Weight): Compares against target market price
          const priceScoreWeighted = Math.max(0, 40 - (avgPrice / 2));
          
          // 3. Logistics & Distance (20% Weight): Distance penalization
          const distanceScoreWeighted = Math.max(0, 20 - (avgDistance / 5));

          const matchScorePercent = Math.min(100, qualityScoreWeighted + priceScoreWeighted + distanceScoreWeighted);

          matches.push({
            match_id: `MATCH-${Math.floor(1000 + Math.random() * 9000)}`,
            crop_name: crop,
            required_quantity_kg: quantity_kg,
            matched_quantity_kg: currentQty,
            match_score_percent: Number(matchScorePercent.toFixed(2)),
            quality_score: Number(avgQuality.toFixed(2)),
            confidence_score: Number(avgConfidence.toFixed(2)),
            is_fully_fulfilled: true,
            total_estimated_value: Number(totalValue.toFixed(2)),
            contributors: currentMatchContributors,
            logistics_summary: {
              total_distance_km: Number(totalDistanceKm.toFixed(2)),
              estimated_travel_time: `${Math.ceil(totalDistanceKm * 2)} min`,
              vehicle_capacity: '1.2 Ton Mini-Truck',
            }
          });
          break; 
        }
      }
    }

    matches.sort((a, b) => b.match_score_percent - a.match_score_percent);
    
    return {
      success: true,
      message: 'Background job dispatched. Returning fast MVP match array.',
      matches: matches.slice(0, 5),
    };
  }
}
