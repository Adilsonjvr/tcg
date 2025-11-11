import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { RoboflowScanStub } from './stubs/inventory.stub';
import { MemoryCache } from '../common/cache/memory-cache';

@Injectable()
export class RoboflowService {
  private readonly logger = new Logger(RoboflowService.name);
  private readonly apiKey = process.env.ROBOFLOW_API_KEY;
  private readonly project = process.env.ROBOFLOW_PROJECT;
  private readonly modelVersion = process.env.ROBOFLOW_MODEL_VERSION ?? '1';
  private readonly useMocks = process.env.USE_API_MOCKS === 'true';
  private readonly cache = new MemoryCache<any>(parseInt(process.env.ROBOFLOW_CACHE_TTL_MS ?? '120000', 10));

  async scanImage(base64Image: string): Promise<unknown> {
    if (!base64Image) {
      throw new InternalServerErrorException('image payload is required');
    }

    if (this.useMocks) {
      this.logger.debug('Returning Roboflow stub scan response');
      return RoboflowScanStub;
    }

    if (!this.apiKey || !this.project) {
      this.logger.warn('Roboflow credentials are not configured. Returning empty result.');
      return [];
    }

    const endpoint = new URL(`https://detect.roboflow.com/${this.project}/${this.modelVersion}`);
    endpoint.searchParams.set('api_key', this.apiKey);

    const cacheKey = `roboflow:${base64Image.slice(0, 128)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      let response: globalThis.Response;

      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: base64Image,
        });
      } catch (error) {
        this.logger.error('Roboflow request failed', error instanceof Error ? error.stack : String(error));
        throw new InternalServerErrorException('Failed to call Roboflow service');
      }

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Roboflow request returned ${response.status}: ${body}`);
        throw new InternalServerErrorException('Roboflow responded with an error');
      }

      const payload = await response.json();
      return this.normalisePredictions(payload);
    });
  }

  private normalisePredictions(payload: any) {
    const predictions = payload?.predictions ?? payload ?? [];
    return predictions.map((prediction: any) => ({
      label: prediction.class ?? prediction.prediction ?? 'Carta',
      confidence: typeof prediction.confidence === 'number' ? prediction.confidence : null,
      cardDefinitionId: prediction.cardDefinitionId ?? prediction.metadata?.cardDefinitionId ?? null,
    }));
  }
}
