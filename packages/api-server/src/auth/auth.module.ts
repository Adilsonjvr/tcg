import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { ApiServicesModule } from '../api-services/api-services.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WebhooksController } from './webhooks.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Module({
  imports: [
    UsersModule,
    ApiServicesModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, LocalAuthGuard],
  controllers: [AuthController, WebhooksController],
  exports: [AuthService],
})
export class AuthModule {}
