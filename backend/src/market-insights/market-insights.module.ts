import { Module } from '@nestjs/common';
import { MarketInsightsController } from './market-insights.controller';
import { MarketInsightsService } from './market-insights.service';
import { PrismaModule } from '../prisma/prisma.module';

import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [MarketInsightsController],
  providers: [MarketInsightsService],
  exports: [MarketInsightsService],
})
export class MarketInsightsModule {}
