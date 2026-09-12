import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ConsumerService } from './consumer.service';

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

  @Get('cart')
  getCart(@Request() req: any) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.consumerService.getCart(userId);
  }

  @Post('cart/add')
  addToCart(@Request() req: any, @Body() body: { product_id: string; quantity_kg: number }) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.consumerService.addToCart(userId, body.product_id, body.quantity_kg);
  }

  @Delete('cart/clear')
  clearCart(@Request() req: any) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.consumerService.clearCart(userId);
  }

  @Get('addresses')
  getAddresses(@Request() req: any) {
    const userId = req.user?.id || 'd3099955-fbe0-4cd9-bc20-94d35eb99411';
    return this.consumerService.getAddresses(userId);
  }
}
