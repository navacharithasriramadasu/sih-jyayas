import { Module } from '@nestjs/common';
import { ProduceService } from './produce.service';
import { ProduceController } from './produce.controller';

import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ProduceController],
  providers: [ProduceService],
})
export class ProduceModule {}
