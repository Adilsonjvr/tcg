import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiServicesModule } from '../api-services/api-services.module';

@Module({
  imports: [PrismaModule, ApiServicesModule],
  providers: [InventoryService],
  controllers: [InventoryController],
})
export class InventoryModule {}
