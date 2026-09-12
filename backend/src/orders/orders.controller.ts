import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/consumer/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  createOrder(@Request() req, @Body() body: { address_id: string; payment_method: any }) {
    return this.ordersService.checkout(req.user.id, body.address_id, body.payment_method);
  }
}
