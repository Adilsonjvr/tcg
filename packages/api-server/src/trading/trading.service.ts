import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  EventParticipationStatus,
  InventoryStatus,
  ParentalApprovalStatus,
  Prisma,
  TradeParticipantSide,
  TradeStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActiveUser } from '../auth/types/active-user.interface';
import { ProposeTradeDto } from './dto/propose-trade.dto';
import { StreamChatService } from '../api-services/stream.service';

@Injectable()
export class TradingService {
  private readonly valuationFallback = 0;
  private readonly tradeInclude = {
    items: {
      include: {
        inventoryItem: {
          include: {
            cardDefinition: true,
          },
        },
      },
    },
    approvals: true,
    event: {
      select: {
        id: true,
        titulo: true,
        startAt: true,
      },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamChatService: StreamChatService,
  ) {}

  async proposeTrade(user: ActiveUser, dto: ProposeTradeDto) {
    if (user.id === dto.recetorId) {
      throw new BadRequestException('recetorId must be different from the proposer');
    }

    const [event, receiver] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: dto.eventId }, select: { id: true, status: true } }),
      this.prisma.user.findUnique({ where: { id: dto.recetorId }, select: { id: true, role: true, responsavelId: true } }),
    ]);

    if (!event) {
      throw new NotFoundException('event not found');
    }

    if (!receiver) {
      throw new NotFoundException('receiver not found');
    }

    const [proponentParticipation, receiverParticipation] = await Promise.all([
      this.prisma.eventParticipation.findUnique({
        where: {
          eventId_userId: {
            eventId: dto.eventId,
            userId: user.id,
          },
        },
        select: {
          status: true,
        },
      }),
      this.prisma.eventParticipation.findUnique({
        where: {
          eventId_userId: {
            eventId: dto.eventId,
            userId: dto.recetorId,
          },
        },
        select: {
          status: true,
        },
      }),
    ]);

    if (!proponentParticipation || proponentParticipation.status !== EventParticipationStatus.CONFIRMADO) {
      throw new ForbiddenException('proponent is not confirmed in this event');
    }

    if (!receiverParticipation || receiverParticipation.status !== EventParticipationStatus.CONFIRMADO) {
      throw new ForbiddenException('receiver is not confirmed in this event');
    }

    if (!dto.proponenteItemIds.length || !dto.recetorItemIds.length) {
      throw new BadRequestException('both sides must select at least one item');
    }

    const proponentItemIds = [...new Set(dto.proponenteItemIds)];
    const receiverItemIds = [...new Set(dto.recetorItemIds)];

    const [proponentItems, receiverItems] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: {
          id: { in: proponentItemIds },
        },
        select: {
          id: true,
          ownerId: true,
          status: true,
          valorEstimado: true,
          precoVendaDesejado: true,
        },
      }),
      this.prisma.inventoryItem.findMany({
        where: {
          id: { in: receiverItemIds },
        },
        select: {
          id: true,
          ownerId: true,
          status: true,
          valorEstimado: true,
          precoVendaDesejado: true,
        },
      }),
    ]);

    if (proponentItems.length !== proponentItemIds.length) {
      throw new NotFoundException('one or more proposer items were not found');
    }

    if (receiverItems.length !== receiverItemIds.length) {
      throw new NotFoundException('one or more receiver items were not found');
    }

    this.ensureItemsBelongTo(proponentItems, user.id, 'proponent');
    this.ensureItemsBelongTo(receiverItems, dto.recetorId, 'receiver');

    if (user.role === UserRole.MENOR && ((dto.proponenteDinheiro ?? 0) > 0 || (dto.recetorDinheiro ?? 0) > 0)) {
      throw new ForbiddenException('Minors cannot propose trades involving money');
    }

    const valuationProponent = this.calculateValuation(proponentItems) + (dto.proponenteDinheiro ?? 0);
    const valuationReceiver = this.calculateValuation(receiverItems) + (dto.recetorDinheiro ?? 0);
    this.ensureDifferenceWithinLimit(valuationProponent, valuationReceiver);

    const involvesMinor = user.role === UserRole.MENOR || receiver.role === UserRole.MENOR;
    const status = involvesMinor ? TradeStatus.PENDENTE_APROVACAO_PARENTAL : TradeStatus.PENDENTE_UTILIZADOR;

    const trade = await this.prisma.$transaction(async (tx) => {
      const createdTrade = await tx.trade.create({
        data: {
          eventId: dto.eventId,
          proponenteId: user.id,
          recetorId: dto.recetorId,
          status,
          proponenteDinheiro: dto.proponenteDinheiro ? new Prisma.Decimal(dto.proponenteDinheiro) : undefined,
          recetorDinheiro: dto.recetorDinheiro ? new Prisma.Decimal(dto.recetorDinheiro) : undefined,
          avaliacaoProponente: new Prisma.Decimal(valuationProponent),
          avaliacaoRecetor: new Prisma.Decimal(valuationReceiver),
          diferencaValorAbsoluta: new Prisma.Decimal(Math.abs(valuationProponent - valuationReceiver)),
          diferencaPercentual: new Prisma.Decimal(this.calculateDifferencePercent(valuationProponent, valuationReceiver) * 100),
        },
      });

      const tradeItemsData = [
        ...proponentItems.map((item) => ({
          tradeId: createdTrade.id,
          inventoryItemId: item.id,
          side: TradeParticipantSide.PROPONENTE,
          valuation: new Prisma.Decimal(this.getItemValuation(item)),
        })),
        ...receiverItems.map((item) => ({
          tradeId: createdTrade.id,
          inventoryItemId: item.id,
          side: TradeParticipantSide.RECETOR,
          valuation: new Prisma.Decimal(this.getItemValuation(item)),
        })),
      ];

      await tx.tradeItem.createMany({
        data: tradeItemsData,
      });

      await tx.inventoryItem.updateMany({
        where: {
          id: {
            in: [...proponentItemIds, ...receiverItemIds],
          },
        },
        data: {
          status: InventoryStatus.EM_PROPOSTA,
        },
      });

      if (involvesMinor) {
        const approvals: { tradeId: string; responsavelId: string; status: ParentalApprovalStatus }[] = [];
        if (user.role === UserRole.MENOR && user.responsavelId) {
          approvals.push({
            tradeId: createdTrade.id,
            responsavelId: user.responsavelId,
            status: ParentalApprovalStatus.PENDENTE,
          });
        }
        if (receiver.role === UserRole.MENOR && receiver.responsavelId) {
          approvals.push({
            tradeId: createdTrade.id,
            responsavelId: receiver.responsavelId,
            status: ParentalApprovalStatus.PENDENTE,
          });
        }
        if (approvals.length) {
          await tx.tradeApproval.createMany({
            data: approvals,
          });
        }
      }

      return createdTrade;
    });

    return trade;
  }

  private ensureItemsBelongTo(items: Array<{ ownerId: string; status: InventoryStatus }>, ownerId: string, side: string) {
    const invalidOwner = items.find((item) => item.ownerId !== ownerId);
    if (invalidOwner) {
      throw new ForbiddenException(`${side} items contain cards that do not belong to the user`);
    }

    const unavailable = items.find((item) => item.status !== InventoryStatus.DISPONIVEL);
    if (unavailable) {
      throw new BadRequestException(`${side} items contain cards that are not available`);
    }
  }

  private calculateValuation(items: Array<{ valorEstimado: Prisma.Decimal | null; precoVendaDesejado: Prisma.Decimal | null }>) {
    return items.reduce((sum, item) => sum + this.getItemValuation(item), 0);
  }

  private getItemValuation(item: { valorEstimado: Prisma.Decimal | null; precoVendaDesejado: Prisma.Decimal | null }) {
    const valor = item.valorEstimado ?? item.precoVendaDesejado;
    return valor ? Number(valor) : this.valuationFallback;
  }

  private ensureDifferenceWithinLimit(proponent: number, receiver: number) {
    const percentage = this.calculateDifferencePercent(proponent, receiver);
    if (percentage > 0.15) {
      throw new BadRequestException('trade value difference exceeds the 15% limit');
    }
  }

  private calculateDifferencePercent(proponent: number, receiver: number) {
    const maxValue = Math.max(proponent, receiver, 1);
    const diff = Math.abs(proponent - receiver);
    return diff / maxValue;
  }

  async acceptTrade(user: ActiveUser, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        approvals: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('trade not found');
    }

    if (![trade.proponenteId, trade.recetorId].includes(user.id)) {
      throw new ForbiddenException('you are not part of this trade');
    }

    if (trade.status !== TradeStatus.PENDENTE_UTILIZADOR && trade.status !== TradeStatus.PENDENTE_APROVACAO_PARENTAL) {
      throw new ConflictException('trade cannot be accepted in its current status');
    }

    if (trade.status === TradeStatus.PENDENTE_APROVACAO_PARENTAL) {
      const pendingApprovals = trade.approvals.filter((approval) => approval.status === ParentalApprovalStatus.PENDENTE);
      if (pendingApprovals.length) {
        throw new ForbiddenException('trade is waiting for parental approval');
      }
    }

    if (trade.recetorId !== user.id) {
      throw new ForbiddenException('only the receiver can accept this trade');
    }

    const channel = await this.streamChatService.createTradeChannel({
      tradeId: trade.id,
      memberIds: [trade.proponenteId, trade.recetorId],
    });

    return this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: TradeStatus.ACEITE,
        acceptedAt: new Date(),
        chatChannelId: channel.channelId,
      },
    });
  }

  async confirmHandshake(user: ActiveUser, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!trade) {
      throw new NotFoundException('trade not found');
    }

    if (![trade.proponenteId, trade.recetorId].includes(user.id)) {
      throw new ForbiddenException('you are not part of this trade');
    }

    if (trade.status !== TradeStatus.ACEITE) {
      throw new ConflictException('handshake can only be confirmed for accepted trades');
    }

    const now = new Date();
    const isProponent = user.id === trade.proponenteId;

    const updatedTrade = await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        proponenteHandshakeAt: isProponent ? now : trade.proponenteHandshakeAt,
        recetorHandshakeAt: !isProponent ? now : trade.recetorHandshakeAt,
      },
    });

    if (updatedTrade.proponenteHandshakeAt && updatedTrade.recetorHandshakeAt) {
      await this.completeTrade(updatedTrade);
    }

    return updatedTrade;
  }

  private async completeTrade(trade: Prisma.TradeUncheckedUpdateInput & { id: string }) {
    const tradeWithItems = await this.prisma.trade.findUniqueOrThrow({
      where: { id: trade.id },
      include: {
        items: true,
      },
    });

    const proponentItemIds = tradeWithItems.items
      .filter((item) => item.side === TradeParticipantSide.PROPONENTE)
      .map((item) => item.inventoryItemId);
    const receiverItemIds = tradeWithItems.items
      .filter((item) => item.side === TradeParticipantSide.RECETOR)
      .map((item) => item.inventoryItemId);

    await this.prisma.$transaction([
      this.prisma.inventoryItem.updateMany({
        where: { id: { in: proponentItemIds } },
        data: {
          ownerId: tradeWithItems.recetorId,
          status: InventoryStatus.DISPONIVEL,
        },
      }),
      this.prisma.inventoryItem.updateMany({
        where: { id: { in: receiverItemIds } },
        data: {
          ownerId: tradeWithItems.proponenteId,
          status: InventoryStatus.DISPONIVEL,
        },
      }),
      this.prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: TradeStatus.CONCLUIDA,
          completedAt: new Date(),
        },
      }),
    ]);
  }

  async cancelTrade(user: ActiveUser, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        items: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('trade not found');
    }

    if (![trade.proponenteId, trade.recetorId].includes(user.id)) {
      throw new ForbiddenException('you are not part of this trade');
    }

    const blockedStatuses: TradeStatus[] = [
      TradeStatus.CONCLUIDA,
      TradeStatus.CANCELADA,
      TradeStatus.REJEITADO,
    ];
    if (blockedStatuses.includes(trade.status)) {
      throw new ConflictException('trade cannot be cancelled in its current status');
    }

    await this.releaseTradeItems(trade.id, trade.items);

    return this.prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: TradeStatus.CANCELADA,
        cancelledAt: new Date(),
      },
      include: this.tradeInclude,
    });
  }

  async rejectTrade(user: ActiveUser, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        items: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('trade not found');
    }

    if (trade.recetorId !== user.id) {
      throw new ForbiddenException('only the receiver can reject the trade');
    }

    const rejectableStatuses: TradeStatus[] = [
      TradeStatus.PENDENTE_UTILIZADOR,
      TradeStatus.PENDENTE_APROVACAO_PARENTAL,
    ];
    if (!rejectableStatuses.includes(trade.status)) {
      throw new ConflictException('trade cannot be rejected in its current status');
    }

    await this.releaseTradeItems(trade.id, trade.items);

    return this.prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: TradeStatus.REJEITADO,
        cancelledAt: new Date(),
      },
      include: this.tradeInclude,
    });
  }

  private async releaseTradeItems(tradeId: string, items?: Array<{ inventoryItemId: string }>) {
    const tradeItems =
      items ??
      (await this.prisma.tradeItem.findMany({
        where: { tradeId },
        select: { inventoryItemId: true },
      }));

    if (!tradeItems.length) {
      return;
    }

    await this.prisma.inventoryItem.updateMany({
      where: { id: { in: tradeItems.map((item) => item.inventoryItemId) } },
      data: {
        status: InventoryStatus.DISPONIVEL,
      },
    });
  }

  getTradesForUser(user: ActiveUser) {
    return this.prisma.trade.findMany({
      where: {
        OR: [{ proponenteId: user.id }, { recetorId: user.id }],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: this.tradeInclude,
    });
  }

  async getTradeById(user: ActiveUser, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: this.tradeInclude,
    });

    if (!trade) {
      throw new NotFoundException('trade not found');
    }

    if (![trade.proponenteId, trade.recetorId].includes(user.id)) {
      throw new ForbiddenException('you are not part of this trade');
    }

    return trade;
  }
}
