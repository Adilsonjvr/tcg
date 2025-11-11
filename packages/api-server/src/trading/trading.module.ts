import { Module } from '@nestjs/common';
import { TradingService } from './trading.service';
import { TradingController } from './trading.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiServicesModule } from '../api-services/api-services.module';

@Module({
  imports: [PrismaModule, ApiServicesModule],
  providers: [TradingService],
  controllers: [TradingController],
})
export class TradingModule {}
