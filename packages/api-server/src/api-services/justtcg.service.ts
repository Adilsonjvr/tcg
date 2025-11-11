import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { JustTcgPriceHistoryStub } from './stubs/inventory.stub';
import { MemoryCache } from '../common/cache/memory-cache';

@Injectable()
export class JustTcgService {
  private readonly logger = new Logger(JustTcgService.name);
  private readonly apiBaseUrl = process.env.JUSTTCG_API_BASE_URL ?? 'https://api.justtcg.com';
  private readonly apiKey = process.env.JUSTTCG_API_KEY;
  private readonly useMocks = process.env.USE_API_MOCKS === 'true';
  private readonly cache = new MemoryCache<any>(parseInt(process.env.JUSTTCG_CACHE_TTL_MS ?? '300000', 10));
  private readonly maxRetries = 3;

  async getPriceHistory(cardId: string): Promise<unknown> {
    if (!cardId) {
      throw new InternalServerErrorException('cardId must be provided');
    }

    if (this.useMocks) {
      this.logger.debug(`Returning JustTCG stub price history for card ${cardId}`);
      return {
        ...JustTcgPriceHistoryStub,
        cardId,
      };
    }

    if (!this.apiKey) {
      this.logger.warn('JUSTTCG_API_KEY is not configured. Returning empty result.');
      return [];
    }

    const cacheKey = `justtcg:${cardId}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const endpoint = new URL(`/price-history/${encodeURIComponent(cardId)}`, this.apiBaseUrl);
      let attempt = 0;
      while (attempt < this.maxRetries) {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${this.apiKey as string}`,
            Accept: 'application/json',
          };
          const response = await fetch(endpoint, { headers });

          if (!response.ok) {
            const body = await response.text();
            this.logger.warn(`JustTCG request returned ${response.status}: ${body}`);
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
            continue;
          }

          const payload = await response.json();
          return this.normaliseHistory(payload);
        } catch (error) {
          this.logger.error('JustTCG request failed', error instanceof Error ? error.stack : String(error));
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }

      throw new InternalServerErrorException('Failed to call JustTCG service');
    });
  }

  private normaliseHistory(payload: any) {
    const points = payload?.data ?? payload?.history ?? payload ?? [];
    return points.map((point: any) => ({
      date: point.date ?? point.timestamp ?? null,
      low: point.low ?? point.lowPrice ?? null,
      mid: point.mid ?? point.averagePrice ?? null,
      high: point.high ?? point.highPrice ?? null,
      market: point.market ?? point.marketPrice ?? null,
      currency: point.currency ?? 'USD',
    }));
  }
}
