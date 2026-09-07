import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { MatchingProcessor } from './matching.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'matching',
    }),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingProcessor],
})
export class MatchingModule {}
