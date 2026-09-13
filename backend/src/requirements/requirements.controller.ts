import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { Prisma } from '@prisma/client';

@Controller('api/v1/buyer/requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() body: any,
  ) {
    let buyerId = body.buyer_id;
    if (!buyerId && auth) {
      const token = auth.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        buyerId = payload.sub;
      } catch (e) {}
    }
    if (!buyerId) throw new Error("Unauthorized: buyer_id required");

    const dataObj = body.data || body;
    const reqData: Omit<Prisma.BuyerRequirementCreateInput, 'buyer'> = {
      crop_name: dataObj.crop_name,
      variety: dataObj.variety || null,
      required_quantity_kg: Number(dataObj.required_quantity_kg),
      target_price_min: Number(dataObj.target_price_min),
      target_price_max: Number(dataObj.target_price_max),
      required_by_date: dataObj.required_by_date ? new Date(dataObj.required_by_date) : new Date(Date.now() + 7*24*60*60*1000), // Default 1 week
      quality_grade_required: dataObj.quality_grade_required || 'gradeA',
      delivery_city: dataObj.delivery_city || 'Default City',
      delivery_state: dataObj.delivery_state || 'Default State',
      delivery_latitude: Number(dataObj.delivery_latitude || 0),
      delivery_longitude: Number(dataObj.delivery_longitude || 0),
      delivery_address: dataObj.delivery_address || 'Delivery Address'
    };

    return this.requirementsService.create(buyerId, reqData);
  }

  @Get()
  async findAllForActiveUser(@Headers('authorization') auth: string) {
    if (!auth) throw new Error("Unauthorized");
    const token = auth.split(' ')[1];
    let buyerId = null;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      buyerId = payload.sub;
    } catch (e) {}
    
    if (!buyerId) throw new Error("Invalid token");

    const requirements = await this.requirementsService.findAllByBuyer(buyerId);
    return {
      success: true,
      data: requirements
    };
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
