import { Controller, Get, Post, Body, Param, Req, Headers } from '@nestjs/common';
import { ProduceService } from './produce.service';
import { Prisma } from '@prisma/client';

@Controller('api/v1/farmer/produce')
export class ProduceController {
  constructor(private readonly produceService: ProduceService) {}

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() body: any,
  ) {
    // 1. Extract Farmer ID from body or JWT
    let farmerId = body.farmer_id;
    if (!farmerId && auth) {
      const token = auth.split(' ')[1];
      // Simple base64 decode for MVP (in prod use JwtService)
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        farmerId = payload.sub;
      } catch (e) {}
    }
    if (!farmerId) throw new Error("Unauthorized: farmer_id required");

    // 2. Map flat or nested payload to Prisma Input
    const dataObj = body.data || body;
    const produceData: Omit<Prisma.ProduceInventoryCreateInput, 'farmer'> = {
      crop_name: dataObj.crop_name,
      variety: dataObj.variety || null,
      total_quantity_kg: Number(dataObj.quantity_kg),
      available_quantity_kg: Number(dataObj.quantity_kg),
      expected_price_per_kg: Number(dataObj.price_per_kg),
      harvest_date: dataObj.harvest_date ? new Date(dataObj.harvest_date) : new Date(),
      pickup_latitude: Number(dataObj.latitude || dataObj.pickup_latitude),
      pickup_longitude: Number(dataObj.longitude || dataObj.pickup_longitude),
      pickup_address: dataObj.location || dataObj.pickup_address || "Farm",
      assessment_id: dataObj.assessment_id,
      images: dataObj.images || [],
    };

    return this.produceService.create(farmerId, produceData);
  }

  @Post('assess')
  assessQuality(
    @Body() body: { farmer_id: string; images: string[]; crop_type?: string }
  ) {
    return this.produceService.assessQuality(body.farmer_id, body.images, body.crop_type);
  }

  @Get()
  async findAllForActiveUser(@Headers('authorization') auth: string) {
    if (!auth) throw new Error("Unauthorized");
    const token = auth.split(' ')[1];
    let farmerId = null;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      farmerId = payload.sub;
    } catch (e) {}
    
    if (!farmerId) throw new Error("Invalid token");

    const listings = await this.produceService.findAllByFarmer(farmerId);
    return {
      success: true,
      data: listings
    };
  }

  @Get('farmer/:farmerId')
  findAllByFarmer(@Param('farmerId') farmerId: string) {
    return this.produceService.findAllByFarmer(farmerId);
  }

  @Get('available')
  findAllAvailable() {
    return this.produceService.findAllAvailable();
  }
}
