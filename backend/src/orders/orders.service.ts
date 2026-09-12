import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsumerService } from '../consumer/consumer.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private consumerService: ConsumerService
  ) {}

  async checkout(userId: string, addressId: string, paymentMethod: any) {
    // 1. Fetch Cart
    const cartRes = await this.consumerService.getCart(userId);
    const cart = cartRes.data;

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Fetch Address
    const address = await this.prisma.consumerAddress.findUnique({ where: { id: addressId } });
    if (!address) throw new BadRequestException('Address not found');

    const orderNumber = `AGR-C-${Math.floor(1000 + Math.random() * 9000)}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Create Order via Prisma Transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct stock
      for (const item of cart.items) {
        await tx.consumerProduct.update({
          where: { id: item.product_id },
          data: { available_quantity_kg: { decrement: item.quantity_kg } }
        });
      }

      // Create Order
      const newOrder = await tx.consumerOrder.create({
        data: {
          user_id: userId,
          address_id: addressId,
          delivery_address_snapshot: address as any,
          subtotal: cart.subtotal,
          delivery_fee: cart.delivery_fee,
          total_amount: cart.total_amount,
          total_quantity_kg: (cart.items as any[]).reduce((sum: number, i: any) => sum + Number(i.quantity_kg), 0),
          items_summary: cart.items.map(i => `${i.name} (${i.quantity_kg}kg)`),
          payment_method: paymentMethod || 'cash_on_delivery',
          payment_status: paymentMethod === 'cash_on_delivery' ? 'pending' : 'authorized',
          order_status: 'placed',
          delivery_otp: otp,
          items: {
            create: cart.items.map(item => ({
              product_id: item.product_id,
              product_name: item.name,
              unit_price: item.unit_price,
              unit: '1 kg',
              quantity_kg: item.quantity_kg,
              total_price: item.item_total
            }))
          }
        }
      });

      // Clear Cart
      await tx.consumerCartItem.deleteMany({ where: { cart_id: cart.cart_id } });

      return newOrder;
    });

    return {
      success: true,
      message: 'Order placed successfully',
      data: {
        order_id: order.id,
        order_number: orderNumber,
        delivery_otp: order.delivery_otp,
        total_amount: order.total_amount,
        eta: order.delivery_eta
      }
    };
  }
}
