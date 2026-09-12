import { Controller, Post, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('escrow/:orderId/advance')
  async processAdvance(@Param('orderId') orderId: string) {
    return this.paymentsService.processAdvance(orderId);
  }

  @Post('escrow/:orderId/verify-delivery')
  async verifyDelivery(
    @Param('orderId') orderId: string,
    @Body('otpCode') otpCode: string,
  ) {
    return this.paymentsService.verifyDeliveryOtp(orderId, otpCode);
  }

  @Post('escrow/:orderId/dispute')
  async raiseDispute(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
  ) {
    return this.paymentsService.raiseDispute(orderId, reason);
  }
}
