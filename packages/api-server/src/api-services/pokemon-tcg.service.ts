import { Injectable, Logger } from '@nestjs/common';
import { MemoryCache } from '../common/cache/memory-cache';

interface PokemonTcgApiCard {
  id?: string | number;
  name?: string;
  number?: string;
  set?: {
    id?: string;
    name?: string;
    series?: string;
    ptcgoCode?: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
  tcgplayer?: {
    productId?: number;
  };
  cardmarket?: {
    id?: number;
  };
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
}

export interface PokemonTcgCardSummary {
  id: string;
  name: string;
  setName: string | null;
  serie: string | null;
  collectorNumber: string | null;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[] | null;
  smallImageUrl: string | null;
  largeImageUrl: string | null;
  tcgPlayerProductId: number | null;
  cardMarketId: number | null;
}

export interface PokemonCardSearchFilters {
  name?: string;
  supertype?: string;
  rarity?: string;
  setId?: string;
  setName?: string;
  setSeries?: string;
  regulationMark?: string;
  text?: string;
  types?: string[];
  subtypes?: string[];
  page?: number;
  pageSize?: number;
  orderBy?: string;
  select?: string | string[];
}

export interface PokemonCardSearchResult {
  cards: PokemonTcgCardSummary[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

@Injectable()
export class PokemonTcgService {
  private readonly logger = new Logger(PokemonTcgService.name);
  private readonly baseUrl = process.env.POKEMONTCG_BASE_URL ?? 'https://api.pokemontcg.io/v2';
  private readonly apiKey = process.env.POKEMONTCG_API_KEY;
  private readonly defaultPageSize = parseInt(process.env.POKEMONTCG_PAGE_SIZE ?? '20', 10);
  private readonly maxPageSize = parseInt(process.env.POKEMONTCG_MAX_PAGE_SIZE ?? '30', 10);
  private readonly maxPages = parseInt(process.env.POKEMONTCG_MAX_PAGES ?? '5', 10);
  private readonly defaultSelect =
    'id,name,number,rarity,supertype,subtypes,set.name,set.series,images.small,images.large,tcgplayer.productId,cardmarket.id';
  private readonly cache = new MemoryCache<PokemonCardSearchResult>(
    parseInt(process.env.POKEMONTCG_CACHE_TTL_MS ?? '300000', 10),
  );
  private readonly cardCache = new MemoryCache<PokemonTcgCardSummary | null>(
    parseInt(process.env.POKEMONTCG_CACHE_TTL_MS ?? '300000', 10),
  );
  private readonly requestTimeout = parseInt(process.env.POKEMONTCG_REQUEST_TIMEOUT_MS ?? '30000', 10);
  private readonly requestRetries = parseInt(process.env.POKEMONTCG_REQUEST_RETRIES ?? '0', 10);

  async searchCards(filters: PokemonCardSearchFilters): Promise<PokemonCardSearchResult> {
    if (!this.apiKey) {
      this.logger.warn('POKEMONTCG_API_KEY is not configured. Returning empty result.');
      return {
        cards: [],
        page: 1,
        pageSize: this.defaultPageSize,
        count: 0,
        totalCount: 0,
      };
    }

    const cacheKey = this.buildCacheKey(filters);
    const select = this.normaliseSelect(filters.select) ?? this.defaultSelect;
    const orderBy = filters.orderBy?.trim();

    return this.cache.getOrSet(cacheKey, async () => {
      const query = this.buildQuery(filters);
      const page = this.normalizePage(filters.page);
      const pageSize = this.normalizePageSize(filters.pageSize);

      try {
        return await this.fetchPage({ query, page, pageSize, orderBy, select });
      } catch (error) {
        this.logger.error(
          'Failed to fetch cards from PokémonTCG API',
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    });
  }

  private async fetchPage({
    query,
    page,
    pageSize,
    orderBy,
    select,
  }: {
    query: string;
    page: number;
    pageSize: number;
    orderBy?: string;
    select?: string;
  }): Promise<PokemonCardSearchResult> {
    const url = new URL(`${this.baseUrl}/cards`);
    url.searchParams.set('q', query);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('page', String(page));
    if (orderBy) {
      url.searchParams.set('orderBy', orderBy);
    }
    if (select) {
      url.searchParams.set('select', select);
    }

    const response = await this.resilientFetch(url);

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`PokémonTCG API returned ${response.status}: ${body}`);
      return {
        cards: [],
        page,
        pageSize,
        count: 0,
        totalCount: 0,
      };
    }

    const payload = await response.json();
    const cards = this.normalise(payload?.data ?? []);
    return {
      cards,
      page: payload?.page ?? page,
      pageSize: payload?.pageSize ?? pageSize,
      count: payload?.count ?? cards.length,
      totalCount: payload?.totalCount ?? cards.length,
    };
  }

  async fetchCardById(cardId: string): Promise<PokemonTcgCardSummary | null> {
    const trimmed = cardId.trim();
    if (!trimmed) {
      return null;
    }

    const cacheKey = `pokemontcg:card:${trimmed}`;
    return this.cardCache.getOrSet(cacheKey, async () => {
      try {
        const url = new URL(`${this.baseUrl}/cards/${encodeURIComponent(trimmed)}`);
        const response = await this.resilientFetch(url);

        if (!response.ok) {
          const body = await response.text();
          this.logger.warn(`PokémonTCG card lookup returned ${response.status}: ${body}`);
          return null;
        }

        const payload = await response.json();
        if (!payload?.data) {
          return null;
        }
        return this.mapCard(payload.data as PokemonTcgApiCard);
      } catch (error) {
        this.logger.error(
          `Failed to fetch PokémonTCG card ${cardId}`,
          error instanceof Error ? error.stack : String(error),
        );
        return null;
      }
    });
  }

  private buildQuery(filters: PokemonCardSearchFilters) {
    const clauses: string[] = [];

    if (filters.name?.trim()) {
      clauses.push(this.buildNameClause(filters.name));
    }

    const addExact = (field: string, value?: string) => {
      if (value?.trim()) {
        clauses.push(`${field}:"${this.escapeValue(value)}"`);
      }
    };

    addExact('supertype', filters.supertype);
    addExact('rarity', filters.rarity);
    addExact('set.id', filters.setId);
    addExact('set.name', filters.setName);
    addExact('set.series', filters.setSeries);
    addExact('regulationMark', filters.regulationMark);
    addExact('text', filters.text);

    filters.types?.forEach((type) => addExact('types', type));
    filters.subtypes?.forEach((subtype) => addExact('subtypes', subtype));

    if (clauses.length === 0) {
      clauses.push('name:*');
    }

    return clauses.join(' AND ');
  }

  private normalise(cards: PokemonTcgApiCard[]): PokemonTcgCardSummary[] {
    return cards.map((card) => this.mapCard(card));
  }

  private mapCard(card: PokemonTcgApiCard): PokemonTcgCardSummary {
    return {
      id: card.id?.toString() ?? `${card.name ?? 'card'}-${card.number ?? ''}`,
      name: card.name ?? 'Carta desconhecida',
      setName: card.set?.name ?? null,
      serie: card.set?.series ?? null,
      collectorNumber: card.number ?? null,
      rarity: card.rarity ?? null,
      supertype: card.supertype ?? null,
      subtypes: card.subtypes ?? null,
      smallImageUrl: card.images?.small ?? null,
      largeImageUrl: card.images?.large ?? null,
      tcgPlayerProductId: card.tcgplayer?.productId ?? null,
      cardMarketId: card.cardmarket?.id ?? null,
    };
  }

  private buildNameClause(name: string) {
    const sanitized = name.trim();
    const escaped = this.escapeValue(sanitized);
    const wildcard = this.escapeValue(sanitized.replace(/\s+/g, '*'));
    return `(name:"${escaped}" OR name:"*${wildcard}*")`;
  }

  private escapeValue(value: string) {
    return value.replace(/"/g, '\\"');
  }

  private buildCacheKey(filters: PokemonCardSearchFilters) {
    const normalizedSelect = this.normaliseSelect(filters.select);
    return JSON.stringify({
      ...filters,
      types: filters.types ?? [],
      subtypes: filters.subtypes ?? [],
      orderBy: filters.orderBy ?? null,
      select: normalizedSelect ?? null,
    });
  }

  private normalizePage(page?: number) {
    if (!page) return 1;
    return Math.min(this.maxPages, Math.max(1, page));
  }

  private normalizePageSize(pageSize?: number) {
    if (!pageSize) return this.defaultPageSize;
    return Math.min(this.maxPageSize, Math.max(1, pageSize));
  }

  private async fetchWithTimeout(url: URL, attempt = 1): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      return await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey as string,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async resilientFetch(url: URL): Promise<Response> {
    try {
      return await this.fetchWithTimeout(url);
    } catch (error) {
      if (this.shouldRetry(error, 1)) {
        return this.retryFetch(url, 2);
      }
      throw error;
    }
  }

  private async retryFetch(url: URL, attempt: number): Promise<Response> {
    while (attempt <= this.requestRetries + 1) {
      try {
        return await this.fetchWithTimeout(url, attempt);
      } catch (error) {
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        attempt += 1;
      }
    }
    throw new Error('Max retries exhausted for PokémonTCG request');
  }

  private shouldRetry(error: unknown, attempt: number) {
    if (this.requestRetries < 1) {
      return false;
    }
    if (attempt > this.requestRetries + 1) {
      return false;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }
    if ((error as { name?: string })?.name === 'AbortError') {
      return true;
    }
    return false;
  }

  private normaliseSelect(select?: string | string[]) {
    if (!select) {
      return undefined;
    }
    const list = Array.isArray(select)
      ? select
      : select
          .split(',')
          .map((field) => field.trim())
          .filter(Boolean);
    if (list.length === 0) {
      return undefined;
    }
    return Array.from(new Set(list)).join(',');
  }
}
