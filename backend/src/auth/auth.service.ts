import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';
import { Twilio } from 'twilio';

@Injectable()
export class AuthService {
  private twilioClient: Twilio;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID
    ) {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    } else {
      console.warn('Twilio credentials (including VERIFY_SERVICE_SID) are not fully configured.');
    }
  }

  // Format phone number to E.164 if necessary. Assuming frontend sends +91...
  private formatPhoneNumber(phone: string): string {
    if (!phone.startsWith('+')) {
      return `+${phone}`;
    }
    return phone;
  }

  async sendOtp(phone_number: string, role: Role, is_login?: boolean) {
    const formattedPhone = this.formatPhoneNumber(phone_number);

    // If attempting to login, verify user exists first
    if (is_login) {
      const existingUser = await this.usersService.findByPhone(formattedPhone);
      if (!existingUser) {
        throw new BadRequestException('User not found. Please register first.');
      }
    }

    if (!this.twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log(`[DEV ONLY] Twilio Verify not configured. Mocking OTP send for ${formattedPhone}`);
      return {
        success: true,
        message: `OTP mocked successfully for ${formattedPhone}`,
        session_id: 'twilio-verify-mock',
        expires_in_seconds: 300,
      };
    }

    try {
      const verification = await this.twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: formattedPhone, channel: 'sms' });

      console.log(`Twilio Verify request status for ${formattedPhone}: ${verification.status}`);
      
      return {
        success: true,
        message: `OTP sent successfully to ${formattedPhone}`,
        session_id: 'twilio-verify',
        expires_in_seconds: 300,
      };
    } catch (error) {
      console.error('Failed to send Twilio Verify SMS:', error.message);
      throw new BadRequestException('Failed to send OTP via SMS provider.');
    }
  }

  async verifyOtp(session_id: string, phone_number: string, otp: string) {
    const formattedPhone = this.formatPhoneNumber(phone_number);

    if (this.twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const verificationCheck = await this.twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: formattedPhone, code: otp });

        console.log(`Twilio verification check for ${formattedPhone}: ${verificationCheck.status}`);

        if (verificationCheck.status !== 'approved') {
          throw new BadRequestException('Invalid OTP or OTP expired');
        }
      } catch (error) {
        console.error('Twilio Verify Check Failed:', error.message);
        throw new BadRequestException('Invalid OTP or OTP expired');
      }
    } else {
      // Dev mode fallback
      if (otp !== '123456') {
        throw new BadRequestException('Invalid DEV OTP (use 123456)');
      }
    }

    let user = await this.usersService.findByPhone(formattedPhone);
    if (!user) {
      user = await this.usersService.createUser({
        phone_number: formattedPhone,
        full_name: 'New User',
        role: Role.farmer,
        is_verified: true,
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { is_verified: true },
      });
    }

    return {
      success: true,
      access_token: 'dummy-jwt-access-token',
      refresh_token: 'dummy-jwt-refresh-token',
      user,
    };
  }
}
