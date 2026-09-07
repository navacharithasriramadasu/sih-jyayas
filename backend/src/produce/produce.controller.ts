import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProduceService } from './produce.service';
import { Prisma } from '@prisma/client';

@Controller('api/v1/farmer/produce')
export class ProduceController {
  constructor(private readonly produceService: ProduceService) {}

  @Post()
  create(
    @Body()
    body: {
      farmer_id: string;
      data: Omit<Prisma.ProduceInventoryCreateInput, 'farmer'>;
    },
  ) {
    return this.produceService.create(body.farmer_id, body.data);
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
