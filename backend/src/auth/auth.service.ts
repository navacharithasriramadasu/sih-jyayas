import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import * as twilio from 'twilio';

@Injectable()
export class AuthService {
  private twilioClient: twilio.Twilio;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    }
  }

  async sendOtp(phone_number: string, role: Role) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    console.log(`[DEV ONLY] OTP for ${phone_number} is ${otp}`);

    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          body: `Your AgriConnect verification code is: ${otp}. It is valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER || '+15017122661', // Replace with active Twilio number
          to: phone_number,
        });
        console.log(`Successfully sent SMS to ${phone_number}`);
      } catch (error) {
        console.error('Failed to send Twilio SMS:', error.message);
      }
    }

    await this.prisma.otpSession.create({
      data: {
        id: sessionId,
        phone_number,
        otp_hash: otpHash,
        expires_at: expiresAt,
      },
    });

    return {
      success: true,
      message: `OTP sent successfully to ${phone_number}`,
      session_id: sessionId,
      expires_in_seconds: 300,
    };
  }

  async verifyOtp(session_id: string, phone_number: string, otp: string) {
    const session = await this.prisma.otpSession.findUnique({
      where: { id: session_id },
    });

    if (!session || session.phone_number !== phone_number) {
      throw new BadRequestException('Invalid session');
    }
    if (session.is_used) {
      throw new BadRequestException('OTP already used');
    }
    if (new Date() > session.expires_at) {
      throw new BadRequestException('OTP expired');
    }

    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (session.otp_hash !== inputHash) {
      await this.prisma.otpSession.update({
        where: { id: session_id },
        data: { attempts_count: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpSession.update({
      where: { id: session_id },
      data: { is_used: true },
    });

    let user = await this.usersService.findByPhone(phone_number);
    if (!user) {
      user = await this.usersService.createUser({
        phone_number,
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
