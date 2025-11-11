import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JustTcgService } from '../api-services/justtcg.service';
import { RoboflowService } from '../api-services/roboflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { PokemonTcgService, PokemonCardSearchFilters } from '../api-services/pokemon-tcg.service';

export interface InventoryCardSearchItem {
  id: string;
  name: string;
  setName?: string | null;
  imageUrl?: string | null;
}

export interface InventoryCardSearchResponse {
  data: InventoryCardSearchItem[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly justTcgService: JustTcgService,
    private readonly roboflowService: RoboflowService,
    private readonly pokemonTcgService: PokemonTcgService,
  ) {}

  async searchCards(filters: PokemonCardSearchFilters): Promise<InventoryCardSearchResponse> {
    try {
      const results = await this.pokemonTcgService.searchCards(filters);
      return {
        data: results.cards.map((card) => ({
          id: card.id,
          name: card.name,
          setName: card.setName ?? card.serie ?? null,
          imageUrl: card.smallImageUrl ?? card.largeImageUrl ?? null,
        })),
        page: results.page,
        pageSize: results.pageSize,
        count: results.count,
        totalCount: results.totalCount,
      };
    } catch (error) {
      this.logger.error(
        'Pokémon TCG API search failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Não conseguimos falar com a Pokémon TCG API agora. Tente novamente em alguns segundos.',
      );
    }
  }

  async getCardPriceHistory(cardId: string) {
    try {
      const history = await this.justTcgService.getPriceHistory(cardId);
      return Array.isArray(history) ? history : [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch price history for card ${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  async createInventoryItem(ownerId: string, dto: CreateInventoryItemDto) {
    let cardDefinition = await this.prisma.cardDefinition.findUnique({
      where: { id: dto.cardDefinitionId },
    });

    if (!cardDefinition) {
      const remoteCard = await this.pokemonTcgService.fetchCardById(dto.cardDefinitionId);
      if (!remoteCard) {
        throw new NotFoundException('card definition not found');
      }

      cardDefinition = await this.prisma.cardDefinition.upsert({
        where: { id: remoteCard.id },
        update: {
          nome: remoteCard.name,
          serie: remoteCard.serie,
          setName: remoteCard.setName,
          collectorNumber: remoteCard.collectorNumber,
          rarity: remoteCard.rarity,
          supertype: remoteCard.supertype,
          subtypes: remoteCard.subtypes?.join(', ') ?? null,
          smallImageUrl: remoteCard.smallImageUrl,
          largeImageUrl: remoteCard.largeImageUrl,
          tcgPlayerProductId: remoteCard.tcgPlayerProductId?.toString() ?? null,
          cardMarketId: remoteCard.cardMarketId?.toString() ?? null,
        },
        create: {
          id: remoteCard.id,
          nome: remoteCard.name,
          serie: remoteCard.serie,
          setName: remoteCard.setName,
          collectorNumber: remoteCard.collectorNumber,
          rarity: remoteCard.rarity,
          supertype: remoteCard.supertype,
          subtypes: remoteCard.subtypes?.join(', ') ?? null,
          smallImageUrl: remoteCard.smallImageUrl,
          largeImageUrl: remoteCard.largeImageUrl,
          tcgPlayerProductId: remoteCard.tcgPlayerProductId?.toString() ?? null,
          cardMarketId: remoteCard.cardMarketId?.toString() ?? null,
        },
      });
    }

    return this.prisma.inventoryItem.create({
      data: {
        ownerId,
        cardDefinitionId: dto.cardDefinitionId,
        condition: dto.condition,
        language: dto.language,
        quantity: dto.quantity ?? 1,
        visibility: dto.visibility,
        aquisicaoFonte: dto.aquisicaoFonte,
        precoCompra: dto.precoCompra,
        precoVendaDesejado: dto.precoVendaDesejado,
        valorEstimado: dto.valorEstimado,
        observacoes: dto.observacoes,
      },
      include: {
        cardDefinition: true,
      },
    });
  }

  getInventoryForUser(userId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { ownerId: userId },
      include: {
        cardDefinition: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateInventoryItem(ownerId: string, itemId: string, dto: UpdateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('inventory item not found');
    }

    if (item.ownerId !== ownerId) {
      throw new ForbiddenException('you cannot update items owned by other users');
    }

    const data: Prisma.InventoryItemUpdateInput = {};
    if (typeof dto.visibility !== 'undefined') {
      data.visibility = dto.visibility;
    }

    if (typeof dto.precoVendaDesejado !== 'undefined') {
      data.precoVendaDesejado = dto.precoVendaDesejado;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no fields provided for update');
    }

    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data,
      include: {
        cardDefinition: true,
      },
    });
  }

  async scanInventoryImage(imageBase64: string) {
    try {
      const predictions = await this.roboflowService.scanImage(imageBase64);
      return Array.isArray(predictions) ? predictions : [];
    } catch (error) {
      this.logger.error('Failed to scan inventory image', error instanceof Error ? error.stack : String(error));
      return [];
    }
  }
}
