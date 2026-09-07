import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { Prisma } from '@prisma/client';

@Controller('api/v1/buyer/requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  create(
    @Body()
    body: {
      buyer_id: string;
      data: Omit<Prisma.BuyerRequirementCreateInput, 'buyer'>;
    },
  ) {
    return this.requirementsService.create(body.buyer_id, body.data);
  }

  @Get('buyer/:buyerId')
  findAllByBuyer(@Param('buyerId') buyerId: string) {
    return this.requirementsService.findAllByBuyer(buyerId);
  }

  @Get('open')
  findAllOpen() {
    return this.requirementsService.findAllOpen();
  }
}
