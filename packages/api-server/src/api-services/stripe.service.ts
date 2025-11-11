import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

interface VerificationSessionResult {
  sessionId: string;
  clientSecret: string | null;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripeSecret = process.env.STRIPE_SECRET_KEY;
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  private readonly stripeClient: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    this.stripeClient = this.stripeSecret ? new Stripe(this.stripeSecret) : null;

    if (!this.stripeSecret) {
      this.logger.warn('STRIPE_SECRET_KEY is not configured. Stripe operations will fail until it is provided.');
    }
  }

  async createVerificationSession(userId: string): Promise<VerificationSessionResult> {
    if (!this.stripeClient || !this.stripeSecret) {
      throw new InternalServerErrorException('Stripe secret key is not configured');
    }

    const session = await this.stripeClient.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeVerificationSession: session.id,
        kycStatus: KycStatus.IN_PROGRESS,
      },
    });

    return {
      sessionId: session.id,
      clientSecret: session.client_secret ?? null,
    };
  }

  async handleWebhook(event: Stripe.Event) {
    if (!event.type) {
      this.logger.warn('Received Stripe webhook without type');
      return { received: false };
    }

    switch (event.type) {
      case 'identity.verification_session.verified':
        await this.onVerificationSessionStatusChange(
          event.data.object as Stripe.Identity.VerificationSession,
          KycStatus.VERIFIED,
          true,
        );
        break;
      case 'identity.verification_session.requires_input':
        await this.onVerificationSessionStatusChange(
          event.data.object as Stripe.Identity.VerificationSession,
          KycStatus.IN_PROGRESS,
          false,
        );
        break;
      case 'identity.verification_session.canceled':
        await this.onVerificationSessionStatusChange(
          event.data.object as Stripe.Identity.VerificationSession,
          KycStatus.REJECTED,
          false,
        );
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  constructEventFromPayload(payload: Buffer, signature?: string) {
    if (!this.webhookSecret || !this.stripeClient) {
      this.logger.warn('Stripe webhook secret not configured, skipping signature verification');
      return JSON.parse(payload.toString()) as Stripe.Event;
    }

    try {
      return this.stripeClient.webhooks.constructEvent(payload, signature ?? '', this.webhookSecret);
    } catch (error) {
      this.logger.error('Failed to verify Stripe webhook signature', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Invalid Stripe webhook signature');
    }
  }

  private async onVerificationSessionStatusChange(
    session: Stripe.Identity.VerificationSession,
    status: KycStatus,
    isVerified: boolean,
  ) {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('Verification session without user metadata');
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: status,
        isKycVerified: isVerified,
        stripeVerificationSession: session.id,
      },
    });
  }
}
