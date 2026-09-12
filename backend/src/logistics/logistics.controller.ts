import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { LogisticsService, LocationDto } from './logistics.service';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('optimize-route')
  async optimizeRoute(@Body('locations') locations: LocationDto[]) {
    return this.logisticsService.optimizeRoute(locations);
  }

  @Patch('trip/:id/location')
  async updateLocation(
    @Param('id') tripId: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
  ) {
    return this.logisticsService.updateTripLocation(tripId, lat, lng);
  }
}
