import { Controller, Post, Body, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('api/v1/consumer/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  createOrder(@Request() req: any, @Body() body: { address_id: string; payment_method: any }) {
    // Mock user_id for hackathon MVP since AuthGuard is bypassed
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.ordersService.checkout(userId, body.address_id, body.payment_method);
  }
}
