import { BadRequestException, Controller, ForbiddenException, Post, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ActiveUser } from '../auth/types/active-user.interface';
import { StripeService } from '../api-services/stripe.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly stripeService: StripeService, private readonly usersService: UsersService) {}

  @Post('me/start-kyc')
  async startKyc(@Request() req: { user: ActiveUser }) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new ForbiddenException();
    }

    if (user.role === UserRole.MENOR) {
      throw new ForbiddenException('Minors cannot start a KYC verification');
    }

    if (user.isKycVerified) {
      throw new BadRequestException('KYC verification already completed');
    }

    const session = await this.stripeService.createVerificationSession(user.id);
    const updated = await this.usersService.findById(user.id);

    return {
      sessionId: session.sessionId,
      clientSecret: session.clientSecret,
      kycStatus: updated?.kycStatus ?? user.kycStatus,
    };
  }
}
