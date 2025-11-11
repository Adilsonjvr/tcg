import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventParticipationStatus,
  InventoryStatus,
  ParentalApprovalStatus,
  TradeStatus,
  UserRole,
} from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentalService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async linkAccount(responsavelId: string, parentLinkCode: string) {
    const minor = await this.usersService.findMinorByLinkCode(parentLinkCode);

    if (!minor) {
      throw new NotFoundException('parent link code is invalid');
    }

    if (minor.parentLinkCodeExpiresAt && minor.parentLinkCodeExpiresAt.getTime() < Date.now()) {
      throw new GoneException('parent link code has expired');
    }

    if (minor.responsavelId && minor.responsavelId !== responsavelId) {
      throw new ConflictException('this user is already linked to another guardian');
    }

    if (minor.responsavelId === responsavelId) {
      return {
        childId: minor.id,
        childNome: minor.nome,
        linkedTo: responsavelId,
      };
    }

    const updated = await this.usersService.update(
      { id: minor.id },
      {
        responsavel: {
          connect: { id: responsavelId },
        },
        parentLinkCode: null,
        parentLinkCodeExpiresAt: null,
      },
    );

    return {
      childId: updated.id,
      childNome: updated.nome,
      linkedTo: responsavelId,
    };
  }

  listPendingEventApprovals(responsavelId: string) {
    return this.prisma.eventParticipation.findMany({
      where: {
        user: {
          responsavelId,
        },
        status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
        parentalStatus: ParentalApprovalStatus.PENDENTE,
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  approveEventParticipation(responsavelId: string, participationId: string, note?: string) {
    return this.decideEventParticipation(responsavelId, participationId, true, note);
  }

  rejectEventParticipation(responsavelId: string, participationId: string, note?: string) {
    return this.decideEventParticipation(responsavelId, participationId, false, note);
  }

  listPendingTradeApprovals(responsavelId: string) {
    return this.prisma.tradeApproval.findMany({
      where: {
        responsavelId,
        status: ParentalApprovalStatus.PENDENTE,
      },
      include: {
        trade: {
          include: {
            event: {
              select: { id: true, titulo: true, startAt: true },
            },
            proponente: {
              select: { id: true, nome: true },
            },
            recetor: {
              select: { id: true, nome: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  approveTrade(responsavelId: string, approvalId: string, note?: string) {
    return this.decideTradeApproval(responsavelId, approvalId, true, note);
  }

  rejectTrade(responsavelId: string, approvalId: string, note?: string) {
    return this.decideTradeApproval(responsavelId, approvalId, false, note);
  }

  async getDashboard(responsavelId: string) {
    const dependents = await this.prisma.user.findMany({
      where: { responsavelId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        inventoryItems: {
          select: { id: true, status: true },
        },
        eventParticipations: {
          where: {
            status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
          },
          select: {
            id: true,
            event: {
              select: { id: true, titulo: true, startAt: true },
            },
            createdAt: true,
          },
        },
        approvalsEmitidas: {
          where: {
            status: ParentalApprovalStatus.PENDENTE,
          },
          include: {
            trade: {
              select: {
                id: true,
                status: true,
                event: { select: { titulo: true } },
              },
            },
          },
        },
      },
    });

    return {
      dependents: dependents.map((child) => ({
        id: child.id,
        nome: child.nome,
        email: child.email,
        role: child.role,
        inventoryCount: child.inventoryItems.length,
        pendingEvents: child.eventParticipations,
        pendingTrades: child.approvalsEmitidas,
      })),
    };
  }

  private async decideEventParticipation(
    responsavelId: string,
    participationId: string,
    approve: boolean,
    note?: string,
  ) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: {
        user: true,
        event: true,
      },
    });

    if (!participation) {
      throw new NotFoundException('event participation not found');
    }

    if (participation.user.responsavelId !== responsavelId) {
      throw new ForbiddenException('guardian is not linked to this user');
    }

    if (
      participation.status !== EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL ||
      participation.parentalStatus !== ParentalApprovalStatus.PENDENTE
    ) {
      throw new BadRequestException('participation is not awaiting parental approval');
    }

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: {
        status: approve ? EventParticipationStatus.CONFIRMADO : EventParticipationStatus.REJEITADO,
        parentalStatus: approve ? ParentalApprovalStatus.APROVADO : ParentalApprovalStatus.REJEITADO,
        parentalDecidedById: responsavelId,
        parentalDecidedAt: new Date(),
        parentalDecisionNote: note ?? null,
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return updated;
  }

  private async decideTradeApproval(
    responsavelId: string,
    approvalId: string,
    approve: boolean,
    note?: string,
  ) {
    const approval = await this.prisma.tradeApproval.findUnique({
      where: { id: approvalId },
      include: {
        trade: {
          include: {
            approvals: true,
            items: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('trade approval not found');
    }

    if (approval.responsavelId !== responsavelId) {
      throw new ForbiddenException('guardian is not linked to this approval');
    }

    if (approval.status !== ParentalApprovalStatus.PENDENTE) {
      throw new BadRequestException('approval already processed');
    }

    const updatedApproval = await this.prisma.tradeApproval.update({
      where: { id: approvalId },
      data: {
        status: approve ? ParentalApprovalStatus.APROVADO : ParentalApprovalStatus.REJEITADO,
        decisionAt: new Date(),
        decisionNote: note ?? null,
      },
    });

    if (!approve) {
      await this.handleTradeRejection(approval.trade);
      return updatedApproval;
    }

    const pendingApprovals = await this.prisma.tradeApproval.count({
      where: {
        tradeId: approval.tradeId,
        status: ParentalApprovalStatus.PENDENTE,
      },
    });

    if (pendingApprovals === 0) {
      await this.prisma.trade.update({
        where: { id: approval.tradeId },
        data: {
          status: TradeStatus.PENDENTE_UTILIZADOR,
        },
      });
    }

    return updatedApproval;
  }

  private async handleTradeRejection(trade: { id: string }) {
    const tradeItems = await this.prisma.tradeItem.findMany({
      where: { tradeId: trade.id },
      select: { inventoryItemId: true },
    });

    if (tradeItems.length) {
      await this.prisma.inventoryItem.updateMany({
        where: {
          id: { in: tradeItems.map((item) => item.inventoryItemId) },
        },
        data: {
          status: InventoryStatus.DISPONIVEL,
        },
      });
    }

    await this.prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: TradeStatus.REJEITADO,
        cancelledAt: new Date(),
      },
    });
  }
}
