import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ParentalModule } from './parental/parental.module';
import { InventoryModule } from './inventory/inventory.module';
import { EventsModule } from './events/events.module';
import { TradingModule } from './trading/trading.module';
import { VendorModule } from './vendor/vendor.module';
import { PrismaModule } from './prisma/prisma.module';
import { ApiServicesModule } from './api-services/api-services.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [PrismaModule, ApiServicesModule, AuthModule, UsersModule, ParentalModule, InventoryModule, EventsModule, TradingModule, VendorModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
