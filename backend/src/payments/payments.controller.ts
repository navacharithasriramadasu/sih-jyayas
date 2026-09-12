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

  @Post('razorpay/create-order')
  async createRazorpayOrder(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('currency') currency?: string,
    @Body('paymentType') paymentType?: string,
    @Body('internalOrderId') internalOrderId?: string,
  ) {
    return this.paymentsService.createRazorpayOrder(userId, amount, currency, paymentType, internalOrderId);
  }

  @Post('razorpay/verify')
  async verifyRazorpayPayment(
    @Body('razorpay_order_id') razorpayOrderId: string,
    @Body('razorpay_payment_id') razorpayPaymentId: string,
    @Body('razorpay_signature') razorpaySignature: string,
  ) {
    return this.paymentsService.verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  }
}
