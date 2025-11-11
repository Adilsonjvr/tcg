import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { RapidApiPokemonSearchStub } from './stubs/inventory.stub';
import { MemoryCache } from '../common/cache/memory-cache';

@Injectable()
export class RapidApiService {
  private readonly logger = new Logger(RapidApiService.name);
  private readonly apiKey = process.env.RAPIDAPI_KEY;
  private readonly host = process.env.RAPIDAPI_POKEMON_HOST;
  private readonly endpointPath = process.env.RAPIDAPI_POKEMON_PATH ?? '/search';
  private readonly useMocks = process.env.USE_API_MOCKS === 'true';
  private readonly cache = new MemoryCache<any>(parseInt(process.env.RAPIDAPI_CACHE_TTL_MS ?? '300000', 10));
  private readonly maxRetries = 3;

  async searchCardsByName(name: string): Promise<unknown> {
    if (!name.trim()) {
      return [];
    }

    if (this.useMocks) {
      const normalised = name.trim().toLowerCase();
      this.logger.debug(`Returning RapidAPI stub data for query "${name}"`);
      return RapidApiPokemonSearchStub.filter((card) => card.nome.toLowerCase().includes(normalised));
    }

    if (!this.apiKey || !this.host) {
      this.logger.warn('RapidAPI credentials are not configured. Returning empty result.');
      return [];
    }

    const cacheKey = `rapidapi:${name.toLowerCase()}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const endpoint = new URL(`https://${this.host}${this.endpointPath}`);
      endpoint.searchParams.set('name', name.trim());

      let attempt = 0;
      while (attempt < this.maxRetries) {
        try {
          const headers: Record<string, string> = {
            'X-RapidAPI-Key': this.apiKey as string,
            'X-RapidAPI-Host': this.host as string,
            Accept: 'application/json',
          };
          const response = await fetch(endpoint, {
            headers,
          });

          if (!response.ok) {
            const body = await response.text();
            this.logger.warn(`RapidAPI request returned ${response.status}: ${body}`);
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
            continue;
          }

          const payload = await response.json();
          return this.normaliseResults(payload);
        } catch (error) {
          this.logger.error(
            'RapidAPI request failed',
            error instanceof Error ? error.stack : String(error),
          );
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }

      throw new InternalServerErrorException('Failed to call RapidAPI service');
    });
  }

  private normaliseResults(payload: any) {
    if (!payload) {
      return [];
    }

    const pickRecords = (value: any): any[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.data)) return value.data;
      if (Array.isArray(value?.cards)) return value.cards;
      if (Array.isArray(value?.results)) return value.results;
      return [value];
    };

    const records = pickRecords(payload)
      .filter((record) => Boolean(record))
      .slice(0, 25);

    return records.map((record) => {
      const fallbackName =
        record.name ??
        record.card_name ??
        record.species?.name ??
        record.forms?.[0]?.name ??
        'Carta desconhecida';

      const image =
        record.image ??
        record.imageUrl ??
        record.images?.large ??
        record.images?.small ??
        record.sprites?.other?.['official-artwork']?.front_default ??
        record.sprites?.front_default ??
        null;

      return {
        id:
          record.id?.toString() ??
          record.cardId ??
          record.uuid ??
          record.slug ??
          `${fallbackName}-${record.setCode ?? record.set ?? record.species?.name ?? record.id ?? ''}`,
        name: fallbackName,
        setName: record.set ?? record.card_set ?? record.series ?? record.species?.name ?? null,
        imageUrl: image,
        raw: record,
      };
    });
  }
}
