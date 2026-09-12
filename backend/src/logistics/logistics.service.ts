import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LocationDto {
  lat: number;
  lng: number;
}

@Injectable()
export class LogisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Optimize Route using OSRM (Open Source Routing Machine) API
   * Solves the Traveling Salesperson Problem (TSP) for given coordinates.
   */
  async optimizeRoute(locations: LocationDto[]) {
    try {
      if (locations.length < 2) {
        throw new Error('At least 2 locations (start and end) are required for routing.');
      }

      // OSRM requires coordinates in longitude,latitude format separated by semicolons
      const coordinatesString = locations.map(loc => `${loc.lng},${loc.lat}`).join(';');
      
      // Call OSRM public API for TSP (Trip optimization)
      // Note: We use roundtrip=false to end at the last coordinate (Mandi delivery)
      const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordinatesString}?roundtrip=false&source=first&destination=last&geometries=geojson`;

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code !== 'Ok') {
        throw new Error(`OSRM API Error: ${data.code}`);
      }

      // Extract the optimized sequence and total distance/duration
      const trip = data.trips[0];
      const distanceKm = Number((trip.distance / 1000).toFixed(2));
      const durationMin = Math.ceil(trip.duration / 60);
      
      // OSRM returns waypoints in the optimized order
      const optimizedWaypoints = data.waypoints.map((wp: any) => ({
        original_index: wp.waypoint_index,
        location: {
          lng: wp.location[0],
          lat: wp.location[1],
        },
      }));

      return {
        success: true,
        message: 'Route successfully optimized using OSRM.',
        optimized_route: {
          distance_km: distanceKm,
          estimated_duration_min: durationMin,
          optimized_sequence: optimizedWaypoints,
          // The polyline geojson to render the path on the frontend map
          geometry: trip.geometry, 
        }
      };
    } catch (error: any) {
      console.error('Route Optimization Error:', error);
      throw new InternalServerErrorException('Failed to calculate optimized route.');
    }
  }

  /**
   * Update live location of an FPO Truck (Mocking Redis flow for hackathon)
   * In a real production system with 10k trucks, this would write to Redis, not Postgres.
   */
  async updateTripLocation(tripId: string, lat: number, lng: number) {
    try {
      const trip = await this.prisma.logisticsTrip.update({
        where: { id: tripId },
        data: {
          current_latitude: lat,
          current_longitude: lng,
        }
      });

      return {
        success: true,
        message: 'Live location updated',
        location: { lat: trip.current_latitude, lng: trip.current_longitude }
      };
    } catch (error) {
      console.error('Update Location Error:', error);
      throw new InternalServerErrorException('Failed to update trip location.');
    }
  }
}
