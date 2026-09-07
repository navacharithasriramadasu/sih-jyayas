import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() body: { phone_number: string; role: Role }) {
    return this.authService.sendOtp(body.phone_number, body.role);
  }

  @Post('verify-otp')
  verifyOtp(
    @Body()
    body: {
      session_id: string;
      phone_number: string;
      otp: string;
    },
  ) {
    return this.authService.verifyOtp(body.session_id, body.phone_number, body.otp);
  }
}
