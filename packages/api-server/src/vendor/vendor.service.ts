import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryStatus, TradeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuickSaleDto } from './dto/quick-sale.dto';
import { ActiveUser } from '../auth/types/active-user.interface';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuickSale(user: ActiveUser, dto: QuickSaleDto) {
    if (user.role !== 'VENDEDOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only vendors can register sales');
    }

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });

    if (!item || item.ownerId !== user.id) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.status === InventoryStatus.VENDIDO) {
      throw new ForbiddenException('This item has already been sold');
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const record = await tx.saleRecord.create({
        data: {
          vendorId: user.id,
          inventoryItemId: item.id,
          precoVenda: new Prisma.Decimal(dto.precoVenda),
          compradorNome: dto.compradorNome,
          notas: dto.notas,
        },
        include: {
          inventoryItem: {
            include: {
              cardDefinition: true,
            },
          },
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          status: InventoryStatus.VENDIDO,
        },
      });

      return record;
    });

    return sale;
  }

  async getDashboard(user: ActiveUser) {
    if (user.role !== 'VENDEDOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

    const [salesAggregate, tradesCompleted, recentSales, availableInventory] = await this.prisma.$transaction([
      this.prisma.saleRecord.aggregate({
        where: { vendorId: user.id },
        _count: true,
        _sum: { precoVenda: true },
      }),
      this.prisma.trade.count({
        where: {
          status: TradeStatus.CONCLUIDA,
          OR: [{ proponenteId: user.id }, { recetorId: user.id }],
        },
      }),
      this.prisma.saleRecord.findMany({
        where: { vendorId: user.id },
        include: {
          inventoryItem: {
            include: {
              cardDefinition: true,
            },
          },
        },
        orderBy: {
          vendidoEm: 'desc',
        },
        take: 10,
      }),
      this.prisma.inventoryItem.count({
        where: {
          ownerId: user.id,
          status: InventoryStatus.DISPONIVEL,
        },
      }),
    ]);

    return {
      totalSales: salesAggregate._count ?? 0,
      totalRevenue: Number(salesAggregate._sum?.precoVenda ?? 0),
      tradesCompleted,
      availableInventory,
      recentSales,
    };
  }
}
