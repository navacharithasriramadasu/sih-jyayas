import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserStatus, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
    });
  }

  async findByPhone(phone_number: string) {
    return this.prisma.user.findUnique({
      where: { phone_number },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updateProfile(id: string, data: any) {
    // 1. Update Core User Details
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { 
        full_name: data.full_name,
        preferred_language: data.preferred_language,
        role: data.role as Role,
        is_verified: true, // Assuming saving profile counts as baseline verification
      },
    });

    // 2. Role-specific Upserts
    if (data.role === Role.farmer) {
      await this.prisma.farmerProfile.upsert({
        where: { user_id: id },
        create: {
          user_id: id,
          farm_location: data.farm_location || data.location,
          primary_crops: data.primary_crops || [],
          land_size_acres: data.land_size_acres,
        },
        update: {
          farm_location: data.farm_location || data.location,
          primary_crops: data.primary_crops || [],
          land_size_acres: data.land_size_acres,
        }
      });
    }

    // 3. Bank Account Upsert (if provided)
    if (data.upi_id || data.bank_name) {
      // Find existing primary bank account or create one
      const existingBank = await this.prisma.bankAccount.findFirst({
        where: { user_id: id, is_primary: true }
      });

      if (existingBank) {
        await this.prisma.bankAccount.update({
          where: { id: existingBank.id },
          data: { upi_id: data.upi_id, bank_name: data.bank_name }
        });
      } else {
        await this.prisma.bankAccount.create({
          data: {
            user_id: id,
            upi_id: data.upi_id,
            bank_name: data.bank_name,
            account_number: "PENDING", // Mock for MVP
            ifsc_code: "PENDING",
            is_primary: true
          }
        });
      }
    }

    return {
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        role: updatedUser.role,
        is_verified: updatedUser.is_verified
      }
    };
  }
}
