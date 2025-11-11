import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ParentalService } from './parental.service';
import { ParentalController } from './parental.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UsersModule, PrismaModule],
  providers: [ParentalService],
  controllers: [ParentalController],
})
export class ParentalModule {}
