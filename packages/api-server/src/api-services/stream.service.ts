import { Injectable, Logger } from '@nestjs/common';
import { StreamChat } from 'stream-chat';

interface CreateChannelPayload {
  tradeId: string;
  memberIds: string[];
}

@Injectable()
export class StreamChatService {
  private readonly logger = new Logger(StreamChatService.name);
  private readonly useMocks = process.env.USE_API_MOCKS === 'true';
  private readonly apiKey = process.env.STREAM_API_KEY;
  private readonly apiSecret = process.env.STREAM_API_SECRET;
  private readonly client: StreamChat | null;

  constructor() {
    if (!this.useMocks && this.apiKey && this.apiSecret) {
      this.client = StreamChat.getInstance(this.apiKey, this.apiSecret);
    } else {
      this.client = null;
    }
  }

  async createTradeChannel(payload: CreateChannelPayload): Promise<{ channelId: string }> {
    if (this.useMocks || !this.client) {
      const channelId = `mock-channel-${payload.tradeId}`;
      this.logger.debug(`Mock Stream channel created for trade ${payload.tradeId}`);
      return { channelId };
    }

    const channelId = `trade-${payload.tradeId}`;
    const channel = this.client.channel('messaging', channelId, {
      name: `Trade ${payload.tradeId}`,
      members: payload.memberIds,
    });

    await channel.create();

    return { channelId };
  }
}
