import { Module } from '@nestjs/common';
import { ApiServicesModule } from '../api-services/api-services.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [ApiServicesModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
