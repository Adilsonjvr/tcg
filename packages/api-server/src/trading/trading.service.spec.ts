import { Test, TestingModule } from '@nestjs/testing';
import { TradingService } from './trading.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventParticipationStatus,
  InventoryStatus,
  ParentalApprovalStatus,
  TradeStatus,
  UserRole,
  Prisma,
  TradeParticipantSide,
} from '@prisma/client';
import { ActiveUser } from '../auth/types/active-user.interface';
import { ProposeTradeDto } from './dto/propose-trade.dto';
import { StreamChatService } from '../api-services/stream.service';

describe('TradingService', () => {
  let service: TradingService;
  let prisma: {
    event: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    eventParticipation: { findUnique: jest.Mock };
    inventoryItem: { findMany: jest.Mock; updateMany: jest.Mock };
    trade: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    tradeItem: { createMany: jest.Mock };
    tradeApproval: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let streamService: { createTradeChannel: jest.Mock };

  const baseUser: ActiveUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: UserRole.ADULTO,
    isKycVerified: true,
    responsavelId: null,
  };

  beforeEach(async () => {
    prisma = {
      event: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      eventParticipation: { findUnique: jest.fn() },
      inventoryItem: { findMany: jest.fn(), updateMany: jest.fn() },
      trade: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      tradeItem: { createMany: jest.fn() },
      tradeApproval: { createMany: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    streamService = {
      createTradeChannel: jest.fn().mockResolvedValue({ channelId: 'mock-channel' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        { provide: PrismaService, useValue: prisma },
        { provide: StreamChatService, useValue: streamService },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
  });

  it('creates a trade when data is valid', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 'event-1', status: 'VALIDADO' });
    prisma.user.findUnique.mockResolvedValue({ id: 'receiver-1', role: UserRole.ADULTO, responsavelId: null });
    prisma.eventParticipation.findUnique
      .mockResolvedValueOnce({ status: EventParticipationStatus.CONFIRMADO })
      .mockResolvedValueOnce({ status: EventParticipationStatus.CONFIRMADO });

    prisma.inventoryItem.findMany
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          ownerId: 'user-1',
          status: InventoryStatus.DISPONIVEL,
          valorEstimado: new Prisma.Decimal(50),
          precoVendaDesejado: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'item-2',
          ownerId: 'receiver-1',
          status: InventoryStatus.DISPONIVEL,
          valorEstimado: new Prisma.Decimal(52),
          precoVendaDesejado: null,
        },
      ]);

    prisma.trade.create.mockResolvedValue({
      id: 'trade-1',
      status: TradeStatus.PENDENTE_UTILIZADOR,
    });

    const dto: ProposeTradeDto = {
      eventId: 'event-1',
      recetorId: 'receiver-1',
      proponenteItemIds: ['item-1'],
      recetorItemIds: ['item-2'],
    };

    const result = await service.proposeTrade(baseUser, dto);

    expect(result.id).toBe('trade-1');
    expect(prisma.tradeItem.createMany).toHaveBeenCalled();
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: InventoryStatus.EM_PROPOSTA },
      }),
    );
    expect(prisma.tradeApproval.createMany).not.toHaveBeenCalled();
  });

  it('rejects trade with money when proposer is minor', async () => {
    const minorUser: ActiveUser = {
      ...baseUser,
      role: UserRole.MENOR,
      responsavelId: 'guardian-1',
    };

    prisma.event.findUnique.mockResolvedValue({ id: 'event-1', status: 'VALIDADO' });
    prisma.user.findUnique.mockResolvedValue({ id: 'receiver-1', role: UserRole.ADULTO, responsavelId: null });
    prisma.eventParticipation.findUnique
      .mockResolvedValueOnce({ status: EventParticipationStatus.CONFIRMADO })
      .mockResolvedValueOnce({ status: EventParticipationStatus.CONFIRMADO });
    prisma.inventoryItem.findMany
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          ownerId: 'user-1',
          status: InventoryStatus.DISPONIVEL,
          valorEstimado: new Prisma.Decimal(10),
          precoVendaDesejado: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'item-2',
          ownerId: 'receiver-1',
          status: InventoryStatus.DISPONIVEL,
          valorEstimado: new Prisma.Decimal(10),
          precoVendaDesejado: null,
        },
      ]);

    const dto: ProposeTradeDto = {
      eventId: 'event-1',
      recetorId: 'receiver-1',
      proponenteItemIds: ['item-1'],
      recetorItemIds: ['item-2'],
      proponenteDinheiro: 5,
    };

    await expect(service.proposeTrade(minorUser, dto)).rejects.toThrow('Minors cannot propose trades involving money');
  });

  it('accepts a trade and creates chat channel', async () => {
    prisma.trade.findUnique.mockResolvedValue({
      id: 'trade-1',
      proponenteId: 'user-1',
      recetorId: 'receiver-1',
      status: TradeStatus.PENDENTE_UTILIZADOR,
      approvals: [],
    });

    prisma.trade.update.mockResolvedValue({
      id: 'trade-1',
      status: TradeStatus.ACEITE,
    });

    const result = await service.acceptTrade(
      {
        id: 'receiver-1',
        email: 'receiver@example.com',
        role: UserRole.ADULTO,
        isKycVerified: true,
        responsavelId: null,
      },
      'trade-1',
    );

    expect(streamService.createTradeChannel).toHaveBeenCalledWith({
      tradeId: 'trade-1',
      memberIds: ['user-1', 'receiver-1'],
    });
    expect(result.status).toBe(TradeStatus.ACEITE);
  });

  it('confirms handshake for both parties', async () => {
    const baseTrade = {
      id: 'trade-1',
      proponenteId: 'user-1',
      recetorId: 'receiver-1',
      status: TradeStatus.ACEITE,
      items: [],
    };

    prisma.trade.findUnique
      .mockResolvedValueOnce(baseTrade)
      .mockResolvedValueOnce({
        ...baseTrade,
        items: [
          { inventoryItemId: 'item-1', side: TradeParticipantSide.PROPONENTE },
          { inventoryItemId: 'item-2', side: TradeParticipantSide.RECETOR },
        ],
      });

    prisma.trade.update.mockResolvedValueOnce({
      ...baseTrade,
      proponenteHandshakeAt: new Date(),
      recetorHandshakeAt: null,
    });

    await service.confirmHandshake(baseUser, 'trade-1');

    expect(prisma.trade.update).toHaveBeenCalled();
  });

  it('rejects a trade as receiver', async () => {
    prisma.trade.findUnique.mockResolvedValue({
      id: 'trade-2',
      proponenteId: 'user-1',
      recetorId: 'receiver-1',
      status: TradeStatus.PENDENTE_UTILIZADOR,
      items: [{ inventoryItemId: 'item-123' }],
    });
    prisma.inventoryItem.updateMany.mockResolvedValue({});
    prisma.trade.update.mockResolvedValue({
      id: 'trade-2',
      status: TradeStatus.REJEITADO,
    });

    const result = await service.rejectTrade(
      {
        id: 'receiver-1',
        email: 'receiver@example.com',
        role: UserRole.ADULTO,
        isKycVerified: true,
        responsavelId: null,
      },
      'trade-2',
    );

    expect(result.status).toBe(TradeStatus.REJEITADO);
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalled();
  });
});
