import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  async toggleDuty(userId: string, is_online: boolean, lat: number, lng: number) {
    const partner = await this.prisma.deliveryPartner.upsert({
      where: { user_id: userId },
      update: { duty_status: is_online ? 'online_available' : 'offline', current_lat: lat, current_lng: lng },
      create: { user_id: userId, duty_status: is_online ? 'online_available' : 'offline', current_lat: lat, current_lng: lng, vehicle_number: 'TS 07 EA 4821', license_number: 'TS-DRV-192', upi_id: 'driver@ybl' }
    });
    return { success: true, duty_status: partner.duty_status, message: is_online ? 'You are now ONLINE.' : 'You are OFFLINE.' };
  }

  async getProfile(userId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { user_id: userId }, include: { user: true } });
    if (!partner) throw new NotFoundException('Driver profile not found');
    return { success: true, data: partner };
  }

  async getAvailableTrips(lat: number, lng: number) {
    // In MVP, we just return all 'available' trips. Geofencing is complex for hackathon MVP.
    const trips = await this.prisma.deliveryTrip.findMany({ where: { status: 'available' } });
    return { success: true, count: trips.length, trips };
  }

  async acceptTrip(userId: string, tripId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { user_id: userId } });
    if (!partner) throw new BadRequestException('Partner not found');

    const trip = await this.prisma.deliveryTrip.updateMany({
      where: { id: tripId, status: 'available' },
      data: { driver_id: partner.id, status: 'heading_to_pickup', accepted_at: new Date() }
    });

    if (trip.count === 0) throw new BadRequestException('Trip already accepted by another driver or not found.');

    await this.prisma.deliveryPartner.update({
      where: { id: partner.id },
      data: { duty_status: 'on_active_trip' }
    });

    return { success: true, message: 'Trip accepted successfully.' };
  }

  async updateTripStep(userId: string, tripId: string, step: number, lat: number, lng: number) {
    const statusMap = ['heading_to_pickup', 'at_pickup_hub', 'en_route_customer', 'at_doorstep'];
    if (step < 0 || step > 3) throw new BadRequestException('Invalid step');

    await this.prisma.deliveryTrip.update({
      where: { id: tripId },
      data: { status: statusMap[step] as any }
    });

    return { success: true, current_step: step, status: statusMap[step] };
  }

  async verifyChecklist(userId: string, tripId: string, data: any) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { user_id: userId } });
    await this.prisma.deliveryChecklist.upsert({
      where: { trip_id: tripId },
      update: { ...data },
      create: { trip_id: tripId, driver_id: partner.id, ...data }
    });
    return { success: true, message: 'Checklist verified.' };
  }

  async verifyOtp(userId: string, tripId: string, otp: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { user_id: userId } });
    const trip = await this.prisma.deliveryTrip.findUnique({ where: { id: tripId } });
    
    if (!trip || trip.delivery_otp !== otp) {
      throw new BadRequestException('Invalid Delivery OTP.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryTrip.update({
        where: { id: tripId },
        data: { status: 'delivered', completed_at: new Date() }
      });

      await tx.consumerOrder.update({
        where: { id: trip.order_id },
        data: { order_status: 'delivered' }
      });

      // Instant Payout Ledger
      await tx.driverPayoutLedger.create({
        data: {
          driver_id: partner.id,
          trip_id: trip.id,
          amount: trip.total_payout,
          upi_id: partner.upi_id,
          bank_reference_number: `UPI/2026/${Math.floor(Math.random() * 900000)}`
        }
      });

      await tx.deliveryPartner.update({
        where: { id: partner.id },
        data: { duty_status: 'online_available', wallet_balance: { increment: trip.total_payout }, total_trips_completed: { increment: 1 } }
      });
    });

    return { success: true, message: 'Delivery successfully verified! Payout executed.', trip_status: 'delivered' };
  }

  async pushTelemetry(userId: string, data: any) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { user_id: userId } });
    await this.prisma.deliveryTelemetryLog.create({
      data: {
        driver_id: partner.id,
        trip_id: data.trip_id,
        lat: data.lat,
        lng: data.lng,
        speed_kmph: data.speed,
        heading_degrees: data.heading,
        battery_percentage: data.battery_percentage
      }
    });
    return { status: 'updated' };
  }
}
