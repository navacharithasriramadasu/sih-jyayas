import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    console.log('[AUTH] Operating in Hackathon Mock Mode (OTP: 123456)');
  }

  // Format phone number to E.164 if necessary.
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

    // [MOCK MODE] We skip sending SMS to avoid DLT regulations.
    console.log(`[DEV ONLY] Mocking OTP send for ${formattedPhone}. The OTP is 123456`);
    
    return {
      success: true,
      message: `OTP mocked successfully for ${formattedPhone}`,
      session_id: 'mock-session-id',
      expires_in_seconds: 300,
    };
  }

  async verifyOtp(session_id: string, phone_number: string, otp: string) {
    const formattedPhone = this.formatPhoneNumber(phone_number);

    // [MOCK MODE] Hardcoded OTP verification
    if (otp !== '123456') {
      throw new BadRequestException('Invalid OTP. For this Hackathon demo, use 123456');
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

    const payload = { sub: user.id, phone: user.phone_number, role: user.role };

    return {
      success: true,
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user,
    };
  }
}
