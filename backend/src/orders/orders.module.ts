import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

import { ConsumerModule } from '../consumer/consumer.module';

@Module({
  imports: [ConsumerModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
