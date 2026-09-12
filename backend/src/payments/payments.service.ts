import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: any;

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'fallback_secret',
    });
  }

  /**
   * Called when Buyer confirms the order.
   * Locks 100% in escrow and releases a 20% Advance to the Farmer.
   */
  async processAdvance(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { match: { include: { contributors: true } } }
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.escrow_status !== 'held_in_escrow') {
        throw new BadRequestException('Advance already processed or order not in escrow.');
      }

      // Calculate 20% advance
      const advanceAmount = Number(order.total_amount) * 0.20;
      
      // In a real app, we would loop through multiple contributors. 
      // For the hackathon MVP, we get the first farmer.
      const primaryFarmerId = order.match?.contributors[0]?.farmer_id;
      if (!primaryFarmerId) throw new BadRequestException('No farmer found for this order.');

      // Find Farmer's Bank Account
      const bankAccount = await this.prisma.bankAccount.findFirst({
        where: { user_id: primaryFarmerId, is_primary: true }
      });
      if (!bankAccount) throw new BadRequestException('Farmer bank account not found.');

      // Execute transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { escrow_status: 'partially_released' }
        });

        await tx.settlement.create({
          data: {
            order_id: orderId,
            farmer_id: primaryFarmerId,
            bank_account_id: bankAccount.id,
            payout_amount: advanceAmount,
            settlement_type: 'upi_instant',
            status: 'credited',
            triggered_by_event: 'order_confirmation_advance',
            credited_at: new Date()
          }
        });
      });

      return {
        success: true,
        message: '20% Advance successfully released to Farmer.',
        advance_amount_released: advanceAmount
      };
    } catch (error: any) {
      console.error(error);
      throw new InternalServerErrorException(error.message || 'Failed to process advance.');
    }
  }

  /**
   * Called when FPO Driver enters the Buyer's secret OTP.
   * Verifies OTP, releases remaining 80%.
   */
  async verifyDeliveryOtp(orderId: string, otpCode: string) {
    try {
      const trip = await this.prisma.logisticsTrip.findFirst({
        where: { order_id: orderId },
        include: { stops: true }
      });

      if (!trip) throw new NotFoundException('Logistics trip not found for this order.');

      // Find the Consumer Drop stop
      const dropStop = trip.stops.find(s => s.stop_type === 'consumer_drop');
      if (!dropStop) throw new NotFoundException('Delivery stop not configured.');

      if (dropStop.otp_code !== otpCode) {
        throw new BadRequestException('Invalid OTP. Buyer verification failed.');
      }

      // Valid OTP: Release final 80%
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { match: { include: { contributors: true } } }
      });

      const primaryFarmerId = order?.match?.contributors[0]?.farmer_id;
      const bankAccount = await this.prisma.bankAccount.findFirst({
        where: { user_id: primaryFarmerId, is_primary: true }
      });

      const finalAmount = Number(order?.total_amount) * 0.80;

      await this.prisma.$transaction(async (tx) => {
        // Mark Stop as completed
        await tx.tripStop.update({
          where: { id: dropStop.id },
          data: { is_completed: true, completed_at: new Date() }
        });

        // Mark Trip as completed
        await tx.logisticsTrip.update({
          where: { id: trip.id },
          data: { trip_status: 'completed', completed_at: new Date() }
        });

        // Release Escrow
        await tx.order.update({
          where: { id: orderId },
          data: { escrow_status: 'released', order_status: 'completed' }
        });

        // Clean up Ephemeral Storage (Drop CV images to save space)
        if (order?.match?.contributors) {
          for (const contributor of order.match.contributors) {
             await tx.produceInventory.update({
               where: { id: contributor.produce_id },
               data: { images: [] }
             });
          }
        }

        await tx.settlement.create({
          data: {
            order_id: orderId,
            farmer_id: primaryFarmerId!,
            bank_account_id: bankAccount!.id,
            payout_amount: finalAmount,
            settlement_type: 'instant_mandi_gate',
            status: 'credited',
            triggered_by_event: 'buyer_otp_verified',
            credited_at: new Date()
          }
        });
      });

      return {
        success: true,
        message: 'Delivery verified successfully. Final 80% Escrow released to Farmer.'
      };

    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Failed to verify delivery.');
    }
  }

  /**
   * Called when Buyer rejects the delivery.
   * Freezes Escrow.
   */
  async raiseDispute(orderId: string, reason: string) {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { escrow_status: 'held_in_escrow', order_status: 'cancelled' } // Simplified for MVP
      });

      return {
        success: true,
        message: 'Order disputed. Escrow frozen. Admin intervention required.',
        reason
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to raise dispute.');
    }
  }

  /**
   * Create a Razorpay Order and PaymentTransaction record
   */
  async createRazorpayOrder(userId: string, amount: number, currency: string = 'INR', paymentType: any = 'full_100', internalOrderId?: string) {
    try {
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
        currency,
        receipt: `rcpt_${Date.now()}`
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      // Create tracking transaction
      const transaction = await this.prisma.paymentTransaction.create({
        data: {
          user_id: userId,
          order_id: internalOrderId,
          amount: amount,
          currency: currency,
          gateway: 'razorpay',
          gateway_order_id: razorpayOrder.id,
          status: 'pending',
          payment_type: paymentType
        }
      });

      return {
        success: true,
        razorpay_order_id: razorpayOrder.id,
        transaction_id: transaction.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Failed to create Razorpay order');
    }
  }

  /**
   * Verify the Razorpay Signature
   */
  async verifyRazorpayPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    try {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'fallback_secret';
      
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        throw new BadRequestException('Invalid payment signature. Verification failed.');
      }

      // Update the transaction
      const transaction = await this.prisma.paymentTransaction.update({
        where: { gateway_order_id: razorpayOrderId },
        data: {
          gateway_payment_id: razorpayPaymentId,
          signature: razorpaySignature,
          status: 'verified'
        }
      });

      // Handle escrow locks if this was an advance payment
      if (transaction.order_id && transaction.payment_type === 'advance_20') {
        await this.prisma.order.update({
          where: { id: transaction.order_id },
          data: { escrow_status: 'held_in_escrow' }
        });
      }

      return {
        success: true,
        message: 'Payment verified successfully.',
        transaction_id: transaction.id
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message || 'Payment verification failed');
    }
  }
}
