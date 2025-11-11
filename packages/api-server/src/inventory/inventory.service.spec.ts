import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { PokemonTcgService } from '../api-services/pokemon-tcg.service';
import { JustTcgService } from '../api-services/justtcg.service';
import { RoboflowService } from '../api-services/roboflow.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prismaMock: {
    cardDefinition: { findUnique: jest.Mock };
    inventoryItem: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let pokemonTcgService: jest.Mocked<PokemonTcgService>;
  let justTcgService: jest.Mocked<JustTcgService>;
  let roboflowService: jest.Mocked<RoboflowService>;

  beforeEach(async () => {
    prismaMock = {
      cardDefinition: {
        findUnique: jest.fn(),
      },
      inventoryItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    pokemonTcgService = {
      searchCards: jest.fn(),
      fetchCardById: jest.fn(),
    } as unknown as jest.Mocked<PokemonTcgService>;

    justTcgService = {
      getPriceHistory: jest.fn(),
    } as unknown as jest.Mocked<JustTcgService>;

    roboflowService = {
      scanImage: jest.fn(),
    } as unknown as jest.Mocked<RoboflowService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prismaMock as unknown as PrismaService },
        { provide: PokemonTcgService, useValue: pokemonTcgService },
        { provide: JustTcgService, useValue: justTcgService },
        { provide: RoboflowService, useValue: roboflowService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('returns search results from Pokémon TCG API', async () => {
    pokemonTcgService.searchCards.mockResolvedValue({
      cards: [
        {
          id: 'card-1',
          name: 'Charizard',
          setName: 'Base',
          serie: 'Base',
          smallImageUrl: 'small.png',
          largeImageUrl: null,
        },
      ],
      page: 1,
      pageSize: 20,
      count: 1,
      totalCount: 1,
    } as any);

    const results = await service.searchCards({ name: 'charizard' });

    expect(results).toEqual({
      data: [{ id: 'card-1', name: 'Charizard', setName: 'Base', imageUrl: 'small.png' }],
      page: 1,
      pageSize: 20,
      count: 1,
      totalCount: 1,
    });
    expect(pokemonTcgService.searchCards).toHaveBeenCalledWith({ name: 'charizard' });
  });

  it('throws ServiceUnavailable when Pokémon TCG API fails', async () => {
    pokemonTcgService.searchCards.mockRejectedValue(new Error('fail'));

    await expect(service.searchCards({ name: 'unknown' })).rejects.toThrow('Não conseguimos falar com a Pokémon TCG API agora. Tente novamente em alguns segundos.');
  });

  it('returns price history from JustTCG service', async () => {
    justTcgService.getPriceHistory.mockResolvedValue([{ price: 1 }]);
    const results = await service.getCardPriceHistory('card-1');
    expect(results).toEqual([{ price: 1 }]);
    expect(justTcgService.getPriceHistory).toHaveBeenCalledWith('card-1');
  });

  it('falls back to empty array when JustTCG fails', async () => {
    justTcgService.getPriceHistory.mockRejectedValue(new Error('down'));
    const results = await service.getCardPriceHistory('card-1');
    expect(results).toEqual([]);
  });

  it('returns scan predictions from Roboflow service', async () => {
    roboflowService.scanImage.mockResolvedValue([{ id: 'prediction' }]);
    const results = await service.scanInventoryImage('img');
    expect(results).toEqual([{ id: 'prediction' }]);
  });

  it('falls back to empty array when scan fails', async () => {
    roboflowService.scanImage.mockRejectedValue(new Error('fail'));
    const results = await service.scanInventoryImage('img');
    expect(results).toEqual([]);
  });
});
