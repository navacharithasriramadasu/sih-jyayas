import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConsumerService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CATALOG & DISCOVERY
  // ==========================================
  async getCategories() {
    return this.prisma.consumerCategory.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' },
    });
  }

  async getProducts(category?: string, search?: string) {
    const whereClause: any = { is_available: true, available_quantity_kg: { gt: 0 } };
    
    if (category && category !== 'All') {
      whereClause.category = { name: { equals: category, mode: 'insensitive' } };
    }
    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    const products = await this.prisma.consumerProduct.findMany({
      where: whereClause,
      include: { farmer: { select: { id: true, full_name: true, farmer_profile: true } } },
      orderBy: { is_bestseller: 'desc' },
      take: 20,
    });

    return {
      success: true,
      count: products.length,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        price_per_kg: Number(p.price_per_kg),
        mrp_price: Number(p.mrp_price),
        unit: p.unit,
        available_quantity_kg: Number(p.available_quantity_kg),
        source: p.source,
        distance_km: Number(p.distance_km),
        quality_grade: p.quality_grade,
        icon_emoji: p.icon_emoji,
        image_url: p.image_url,
        rating: Number(p.rating),
        rating_count: p.rating_count,
        delivery_time: p.delivery_time,
        is_bestseller: p.is_bestseller,
        harvest_freshness: p.harvest_freshness
      }))
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.consumerProduct.findUnique({
      where: { id },
      include: { farmer: { select: { id: true, full_name: true } } }
    });
    if (!product) throw new NotFoundException('Product not found');
    return { success: true, data: product };
  }

  // ==========================================
  // CART MANAGEMENT
  // ==========================================
  async getCart(userId: string) {
    const cart = await this.prisma.consumerCart.findUnique({
      where: { user_id: userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      return { success: true, data: { items: [], subtotal: 0, total_amount: 0 } };
    }

    let subtotal = 0;
    const items = cart.items.map(item => {
      const itemTotal = Number(item.quantity_kg) * Number(item.product.price_per_kg);
      subtotal += itemTotal;
      return {
        product_id: item.product_id,
        name: item.product.name,
        unit_price: Number(item.product.price_per_kg),
        quantity_kg: Number(item.quantity_kg),
        item_total: itemTotal,
        icon_emoji: item.product.icon_emoji
      };
    });

    const delivery_fee = subtotal > 199 ? 0 : 20;

    return {
      success: true,
      data: {
        cart_id: cart.id,
        items,
        item_count: items.length,
        subtotal,
        delivery_fee,
        total_amount: subtotal + delivery_fee
      }
    };
  }

  async addToCart(userId: string, productId: string, quantity_kg: number) {
    const product = await this.prisma.consumerProduct.findUnique({ where: { id: productId } });
    if (!product || Number(product.available_quantity_kg) < quantity_kg) {
      throw new BadRequestException('Not enough stock available in your area.');
    }

    let cart = await this.prisma.consumerCart.findUnique({ where: { user_id: userId } });
    if (!cart) {
      cart = await this.prisma.consumerCart.create({ data: { user_id: userId } });
    }

    const existingItem = await this.prisma.consumerCartItem.findUnique({
      where: { cart_id_product_id: { cart_id: cart.id, product_id: productId } }
    });

    if (existingItem) {
      await this.prisma.consumerCartItem.update({
        where: { id: existingItem.id },
        data: { quantity_kg: Number(existingItem.quantity_kg) + quantity_kg }
      });
    } else {
      await this.prisma.consumerCartItem.create({
        data: { cart_id: cart.id, product_id: productId, quantity_kg }
      });
    }

    return { success: true, message: 'Item added to farm basket' };
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.consumerCart.findUnique({ where: { user_id: userId } });
    if (cart) {
      await this.prisma.consumerCartItem.deleteMany({ where: { cart_id: cart.id } });
    }
    return { success: true, message: 'Cart cleared successfully' };
  }

  // ==========================================
  // ADDRESSES
  // ==========================================
  async getAddresses(userId: string) {
    const addrs = await this.prisma.consumerAddress.findMany({ where: { user_id: userId } });
    return { success: true, data: addrs };
  }
}
