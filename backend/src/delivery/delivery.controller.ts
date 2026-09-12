import { Controller, Get, Post, Put, Body, Param, Query, Request } from '@nestjs/common';
import { DeliveryService } from './delivery.service';

@Controller('api/v1/delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('duty/toggle')
  toggleDuty(@Request() req: any, @Body() body: { is_online: boolean; lat: number; lng: number }) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.toggleDuty(userId, body.is_online, body.lat, body.lng);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.getProfile(userId);
  }

  @Get('trips/available')
  getAvailableTrips(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.deliveryService.getAvailableTrips(lat, lng);
  }

  @Post('trips/:tripId/accept')
  acceptTrip(@Request() req: any, @Param('tripId') tripId: string) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.acceptTrip(userId, tripId);
  }

  @Put('trips/:tripId/step')
  updateTripStep(@Request() req: any, @Param('tripId') tripId: string, @Body() body: { step: number; current_lat: number; current_lng: number }) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.updateTripStep(userId, tripId, body.step, body.current_lat, body.current_lng);
  }

  @Post('trips/:tripId/verify-checklist')
  verifyChecklist(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.verifyChecklist(userId, tripId, body);
  }

  @Post('trips/:tripId/verify-otp')
  verifyOtp(@Request() req: any, @Param('tripId') tripId: string, @Body('otp') otp: string) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.verifyOtp(userId, tripId, otp);
  }

  @Post('../logistics/trip/location')
  pushTelemetry(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.deliveryService.pushTelemetry(userId, body);
  }
}
