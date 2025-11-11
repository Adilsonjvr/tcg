import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { ActiveUser } from '../auth/types/active-user.interface';
import { InventoryService, InventoryCardSearchResponse } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { ScanInventoryDto } from './dto/scan-inventory.dto';
import { PokemonCardSearchFilters } from '../api-services/pokemon-tcg.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('cards/search')
  searchCards(@Query() query: Record<string, string | string[] | undefined>): Promise<InventoryCardSearchResponse> {
    const filters = this.parseFilters(query);
    return this.inventoryService.searchCards(filters);
  }

  @Get('cards/:cardId/history')
  getCardHistory(@Param('cardId') cardId: string) {
    if (!cardId) {
      throw new BadRequestException('cardId is required');
    }
    return this.inventoryService.getCardPriceHistory(cardId);
  }

  @Post()
  createInventoryItem(@Body() dto: CreateInventoryItemDto, @Request() req: { user: ActiveUser }) {
    return this.inventoryService.createInventoryItem(req.user.id, dto);
  }

  @Get('me')
  getMyInventory(@Request() req: { user: ActiveUser }) {
    return this.inventoryService.getInventoryForUser(req.user.id);
  }

  @Put(':id')
  updateInventoryItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @Request() req: { user: ActiveUser },
  ) {
    return this.inventoryService.updateInventoryItem(req.user.id, id, dto);
  }

  @Post('scan')
  scanInventory(@Body() dto: ScanInventoryDto) {
    return this.inventoryService.scanInventoryImage(dto.imageBase64);
  }

  private parseFilters(query: Record<string, string | string[] | undefined>): PokemonCardSearchFilters {
    const coerceString = (value?: string | string[]) =>
      Array.isArray(value) ? value[value.length - 1] : value;

    const coerceList = (value?: string | string[]) => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
      }
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    };

    const toNumber = (value?: string | string[]) => {
      const str = coerceString(value);
      if (!str) return undefined;
      const parsed = Number.parseInt(str, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const filters: PokemonCardSearchFilters = {
      name: coerceString(query.name)?.trim(),
      supertype: coerceString(query.supertype)?.trim(),
      rarity: coerceString(query.rarity)?.trim(),
      setId: coerceString(query.setId)?.trim(),
      setName: coerceString(query.setName)?.trim(),
      setSeries: coerceString(query.setSeries)?.trim(),
      regulationMark: coerceString(query.regulationMark)?.trim(),
      text: coerceString(query.text)?.trim(),
      types: coerceList(query.types),
      subtypes: coerceList(query.subtypes),
      page: toNumber(query.page),
      pageSize: toNumber(query.pageSize),
      orderBy: coerceString(query.orderBy)?.trim(),
      select: coerceString(query.select)?.trim(),
    };

    const hasName = typeof filters.name === 'string' && filters.name.length >= 3;
    const hasAdditionalFilters = Boolean(
      filters.supertype ||
        filters.rarity ||
        filters.setId ||
        filters.setName ||
        filters.setSeries ||
        filters.regulationMark ||
        filters.text ||
        (filters.types && filters.types.length > 0) ||
        (filters.subtypes && filters.subtypes.length > 0),
    );

    if (!hasName && !hasAdditionalFilters) {
      throw new BadRequestException('provide a name with at least 3 characters or add another filter');
    }

    if (filters.name && filters.name.length < 3) {
      throw new BadRequestException('name must have at least 3 characters when provided');
    }

    return filters;
  }
}
