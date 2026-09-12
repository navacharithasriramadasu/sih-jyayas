import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @UseGuards(JwtAuthGuard)
  @Post('duty/toggle')
  toggleDuty(@Request() req, @Body() body: { is_online: boolean; lat: number; lng: number }) {
    return this.deliveryService.toggleDuty(req.user.id, body.is_online, body.lat, body.lng);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.deliveryService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('trips/available')
  getAvailableTrips(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.deliveryService.getAvailableTrips(lat, lng);
  }

  @UseGuards(JwtAuthGuard)
  @Post('trips/:tripId/accept')
  acceptTrip(@Request() req, @Param('tripId') tripId: string) {
    return this.deliveryService.acceptTrip(req.user.id, tripId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('trips/:tripId/step')
  updateTripStep(@Request() req, @Param('tripId') tripId: string, @Body() body: { step: number; current_lat: number; current_lng: number }) {
    return this.deliveryService.updateTripStep(req.user.id, tripId, body.step, body.current_lat, body.current_lng);
  }

  @UseGuards(JwtAuthGuard)
  @Post('trips/:tripId/verify-checklist')
  verifyChecklist(@Request() req, @Param('tripId') tripId: string, @Body() body: any) {
    return this.deliveryService.verifyChecklist(req.user.id, tripId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('trips/:tripId/verify-otp')
  verifyOtp(@Request() req, @Param('tripId') tripId: string, @Body('otp') otp: string) {
    return this.deliveryService.verifyOtp(req.user.id, tripId, otp);
  }

  @UseGuards(JwtAuthGuard)
  @Post('../logistics/trip/location')
  pushTelemetry(@Request() req, @Body() body: any) {
    return this.deliveryService.pushTelemetry(req.user.id, body);
  }
}
