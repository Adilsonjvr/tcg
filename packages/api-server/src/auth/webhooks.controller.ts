import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from '../api-services/stripe.service';
import { Public } from './public.decorator';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly stripeService: StripeService) {}

  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = req.rawBody ? (req.rawBody as Buffer) : Buffer.from(JSON.stringify(req.body ?? {}));
    const event = this.stripeService.constructEventFromPayload(rawBody, signature);
    return this.stripeService.handleWebhook(event);
  }
}
