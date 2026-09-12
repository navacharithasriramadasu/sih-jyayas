import { Controller, Get, Query } from '@nestjs/common';
import { MarketInsightsService } from './market-insights.service';

@Controller('market-insights')
export class MarketInsightsController {
  constructor(private readonly marketInsightsService: MarketInsightsService) {}

  @Get('historical-demand')
  async getHistoricalDemand(@Query('crop') crop: string) {
    if (!crop) {
      return { success: false, message: 'Crop parameter is required.' };
    }
    return this.marketInsightsService.getHistoricalDemand(crop);
  }
}
