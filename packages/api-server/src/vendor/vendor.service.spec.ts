import { Test, TestingModule } from '@nestjs/testing';
import { VendorService } from './vendor.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActiveUser } from '../auth/types/active-user.interface';
import { InventoryStatus, TradeStatus } from '@prisma/client';

describe('VendorService', () => {
  let service: VendorService;
  let prisma: {
    inventoryItem: { findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
    saleRecord: { create: jest.Mock; aggregate: jest.Mock; findMany: jest.Mock };
    trade: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  const vendorUser: ActiveUser = {
    id: 'vendor-1',
    email: 'vendor@example.com',
    role: 'VENDEDOR',
    isKycVerified: true,
    responsavelId: null,
  };

  beforeEach(async () => {
    prisma = {
      inventoryItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      saleRecord: {
        create: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      trade: {
        count: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === 'function') {
          return arg(prisma);
        }
        return arg;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
  });

  it('creates quick sale for vendor-owned item', async () => {
    prisma.inventoryItem.findUnique.mockResolvedValue({
      id: 'item-1',
      ownerId: vendorUser.id,
      status: InventoryStatus.DISPONIVEL,
    });
    prisma.saleRecord.create.mockResolvedValue({
      id: 'sale-1',
      inventoryItemId: 'item-1',
      precoVenda: 100,
      inventoryItem: { id: 'item-1' },
    });

    const result = await service.createQuickSale(vendorUser, {
      inventoryItemId: 'item-1',
      precoVenda: 100,
    });

    expect(result.id).toBe('sale-1');
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { status: InventoryStatus.VENDIDO },
    });
  });

  it('returns dashboard summary', async () => {
    prisma.saleRecord.aggregate.mockResolvedValue({
      _count: 2,
      _sum: { precoVenda: 150 },
    });
    prisma.trade.count.mockResolvedValue(3);
    prisma.saleRecord.findMany.mockResolvedValue([]);
    prisma.inventoryItem.count.mockResolvedValue(5);

    const dashboard = await service.getDashboard(vendorUser);
    expect(dashboard.totalSales).toBe(2);
    expect(dashboard.totalRevenue).toBe(150);
    expect(dashboard.tradesCompleted).toBe(3);
    expect(dashboard.availableInventory).toBe(5);
  });
});
