import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/consumer')
export class ConsumerController {
  constructor(private readonly consumerService: ConsumerService) {}

  @Get('categories')
  getCategories() {
    return this.consumerService.getCategories();
  }

  @Get('products')
  getProducts(@Query('category') category: string, @Query('search') search: string) {
    return this.consumerService.getProducts(category, search);
  }

  @Get('products/:id')
  getProductById(@Param('id') id: string) {
    return this.consumerService.getProductById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cart')
  getCart(@Request() req) {
    return this.consumerService.getCart(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/add')
  addToCart(@Request() req, @Body() body: { product_id: string; quantity_kg: number }) {
    return this.consumerService.addToCart(req.user.id, body.product_id, body.quantity_kg);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cart/clear')
  clearCart(@Request() req) {
    return this.consumerService.clearCart(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  getAddresses(@Request() req) {
    return this.consumerService.getAddresses(req.user.id);
  }
}
