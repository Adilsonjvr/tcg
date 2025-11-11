import { Test, TestingModule } from '@nestjs/testing';
import { ParentalService } from './parental.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventParticipationStatus, ParentalApprovalStatus, TradeStatus } from '@prisma/client';

describe('ParentalService', () => {
  let service: ParentalService;
  let usersService: { findMinorByLinkCode: jest.Mock; update: jest.Mock };
  let prisma: {
    eventParticipation: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    tradeApproval: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    tradeItem: {
      findMany: jest.Mock;
    };
    inventoryItem: {
      updateMany: jest.Mock;
    };
    trade: {
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    usersService = {
      findMinorByLinkCode: jest.fn(),
      update: jest.fn(),
    };

    prisma = {
      eventParticipation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      tradeApproval: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      tradeItem: {
        findMany: jest.fn(),
      },
      inventoryItem: {
        updateMany: jest.fn(),
      },
      trade: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentalService,
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ParentalService>(ParentalService);
  });

  it('links account with valid code', async () => {
    usersService.findMinorByLinkCode.mockResolvedValue({
      id: 'minor-1',
      nome: 'Ash',
      parentLinkCodeExpiresAt: new Date(Date.now() + 1000),
      responsavelId: null,
    });
    usersService.update.mockResolvedValue({
      id: 'minor-1',
      nome: 'Ash',
    });

    const result = await service.linkAccount('guardian-1', 'ABCD1234');

    expect(result.childId).toBe('minor-1');
    expect(usersService.update).toHaveBeenCalled();
  });

  it('lists pending event approvals', async () => {
    prisma.eventParticipation.findMany.mockResolvedValue([{ id: 'p1' }]);
    const results = await service.listPendingEventApprovals('guardian-1');
    expect(results).toHaveLength(1);
  });

  it('approves event participation for linked minor', async () => {
    prisma.eventParticipation.findUnique.mockResolvedValue({
      id: 'p1',
      user: { id: 'minor-1', responsavelId: 'guardian-1' },
      event: { id: 'event-1' },
      status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
      parentalStatus: ParentalApprovalStatus.PENDENTE,
    });

    prisma.eventParticipation.update.mockResolvedValue({
      id: 'p1',
      status: EventParticipationStatus.CONFIRMADO,
      parentalStatus: ParentalApprovalStatus.APROVADO,
    });

    const result = await service.approveEventParticipation('guardian-1', 'p1', 'approved');
    expect(result.status).toBe(EventParticipationStatus.CONFIRMADO);
    expect(prisma.eventParticipation.update).toHaveBeenCalled();
  });

  it('rejects event participation for linked minor', async () => {
    prisma.eventParticipation.findUnique.mockResolvedValue({
      id: 'p2',
      user: { id: 'minor-1', responsavelId: 'guardian-1' },
      event: { id: 'event-1' },
      status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
      parentalStatus: ParentalApprovalStatus.PENDENTE,
    });

    prisma.eventParticipation.update.mockResolvedValue({
      id: 'p2',
      status: EventParticipationStatus.REJEITADO,
      parentalStatus: ParentalApprovalStatus.REJEITADO,
    });

    const result = await service.rejectEventParticipation('guardian-1', 'p2', 'nope');
    expect(result.status).toBe(EventParticipationStatus.REJEITADO);
  });

  it('lists pending trade approvals', async () => {
    prisma.tradeApproval.findMany.mockResolvedValue([{ id: 'ta1' }]);
    const results = await service.listPendingTradeApprovals('guardian-1');
    expect(results).toHaveLength(1);
  });

  it('approves a trade when guardian matches', async () => {
    prisma.tradeApproval.findUnique.mockResolvedValue({
      id: 'ta1',
      responsavelId: 'guardian-1',
      status: ParentalApprovalStatus.PENDENTE,
      tradeId: 'trade-1',
      trade: {
        id: 'trade-1',
        approvals: [],
        items: [],
      },
    });
    prisma.tradeApproval.update.mockResolvedValue({});
    prisma.tradeApproval.count.mockResolvedValue(0);
    prisma.trade.update.mockResolvedValue({});

    await service.approveTrade('guardian-1', 'ta1', 'OK');
    expect(prisma.trade.update).toHaveBeenCalled();
  });

  it('rejects a trade and releases items', async () => {
    prisma.tradeApproval.findUnique.mockResolvedValue({
      id: 'ta2',
      responsavelId: 'guardian-1',
      status: ParentalApprovalStatus.PENDENTE,
      trade: {
        id: 'trade-2',
        approvals: [],
        items: [],
      },
    });
    prisma.tradeApproval.update.mockResolvedValue({});
    prisma.tradeItem.findMany.mockResolvedValue([{ inventoryItemId: 'item-1' }]);

    await service.rejectTrade('guardian-1', 'ta2', 'no');
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalled();
  });

  it('returns dashboard summary for dependents', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'child-1',
        nome: 'Kid',
        email: 'kid@mail.com',
        role: 'MENOR',
        inventoryItems: [{ id: 'i1' }],
        eventParticipations: [],
        approvalsEmitidas: [],
      },
    ]);

    const dashboard = await service.getDashboard('guardian-1');
    expect(dashboard.dependents).toHaveLength(1);
    expect(dashboard.dependents[0].inventoryCount).toBe(1);
  });

  it('lists pending trade approvals', async () => {
    prisma.tradeApproval.findMany.mockResolvedValue([{ id: 'ta1' }]);
    const results = await service.listPendingTradeApprovals('guardian-1');
    expect(results).toHaveLength(1);
  });

  it('approves a trade when guardian matches', async () => {
    prisma.tradeApproval.findUnique.mockResolvedValue({
      id: 'ta1',
      responsavelId: 'guardian-1',
      status: ParentalApprovalStatus.PENDENTE,
      tradeId: 'trade-1',
      trade: {
        id: 'trade-1',
        approvals: [],
        items: [],
      },
    });

    prisma.tradeApproval.update.mockResolvedValue({});
    prisma.tradeApproval.count.mockResolvedValue(0);
    prisma.trade.update.mockResolvedValue({});

    await service.approveTrade('guardian-1', 'ta1', 'ok');
    expect(prisma.trade.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trade-1' },
        data: { status: expect.any(String) },
      }),
    );
  });

  it('rejects a trade and releases items', async () => {
    prisma.tradeApproval.findUnique.mockResolvedValue({
      id: 'ta2',
      responsavelId: 'guardian-1',
      status: ParentalApprovalStatus.PENDENTE,
      trade: {
        id: 'trade-2',
        approvals: [],
        items: [],
      },
    });
    prisma.tradeApproval.update.mockResolvedValue({});
    prisma.tradeItem.findMany.mockResolvedValue([
      { inventoryItemId: 'item-1' },
      { inventoryItemId: 'item-2' },
    ]);

    await service.rejectTrade('guardian-1', 'ta2', 'no');
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalled();
    expect(prisma.trade.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trade-2' },
        data: expect.objectContaining({ status: TradeStatus.REJEITADO }),
      }),
    );
  });
});
