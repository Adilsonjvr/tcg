import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EventParticipationStatus,
  EventStatus,
  InventoryStatus,
  InventoryVisibility,
  ParentalApprovalStatus,
  UserRole,
} from '@prisma/client';
import { ActiveUser } from '../auth/types/active-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { FirebaseAdminService } from '../api-services/firebase-admin.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async createEvent(host: ActiveUser, dto: CreateEventDto) {
    if (!host.isKycVerified) {
      throw new ForbiddenException('Host must complete KYC verification before creating events');
    }

    const allowedRoles: UserRole[] = [
      UserRole.VENDEDOR,
      UserRole.ADULTO,
      UserRole.RESPONSAVEL,
      UserRole.ADMIN,
    ];

    if (!allowedRoles.includes(host.role)) {
      throw new ForbiddenException('Only verified adult users can create events');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('startAt and endAt must be valid ISO dates');
    }

    if (startAt >= endAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const slug = await this.generateUniqueSlug(dto.titulo);

    return this.prisma.event.create({
      data: {
        slug,
        titulo: dto.titulo,
        descricao: dto.descricao,
        hostId: host.id,
        venueName: dto.venueName,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        startAt,
        endAt,
        capacidade: dto.capacidade,
      },
    });
  }

  getValidatedEvents() {
    return this.prisma.event.findMany({
      where: {
        status: EventStatus.VALIDADO,
      },
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async confirmPresence(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    if (event.status !== EventStatus.VALIDADO) {
      throw new ForbiddenException('event is not validated yet');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        responsavel: true,
      },
    });

    if (!user) {
      throw new NotFoundException('user not found');
    }

    const existingParticipation = await this.prisma.eventParticipation.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (user.role === UserRole.MENOR) {
      if (!user.responsavelId) {
        throw new ForbiddenException('minor must be linked to a guardian before confirming presence');
      }

      const payload: Prisma.EventParticipationUpsertArgs = {
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
        update: {
          status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
          parentalStatus: ParentalApprovalStatus.PENDENTE,
        },
        create: {
          eventId,
          userId,
          status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
          parentalStatus: ParentalApprovalStatus.PENDENTE,
        },
      };

      const participation = await this.prisma.eventParticipation.upsert(payload);

      await this.firebaseAdminService.notifyGuardianPendingEvent({
        guardianId: user.responsavelId,
        minorId: user.id,
        eventId: event.id,
        eventTitle: event.titulo,
        eventStartAt: event.startAt,
      });

      return participation;
    }

    if (existingParticipation?.status === EventParticipationStatus.CONFIRMADO) {
      return existingParticipation;
    }

    const participation = await this.prisma.eventParticipation.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      update: {
        status: EventParticipationStatus.CONFIRMADO,
        parentalStatus: null,
        parentalDecidedAt: null,
        parentalDecidedById: null,
        parentalDecisionNote: null,
      },
      create: {
        eventId,
        userId,
        status: EventParticipationStatus.CONFIRMADO,
      },
    });

    return participation;
  }

  async getAggregatedInventory(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    if (event.status !== EventStatus.VALIDADO) {
      throw new ForbiddenException('event must be validated to aggregate inventory');
    }

    return this.prisma.inventoryItem.findMany({
      where: {
        visibility: {
          not: InventoryVisibility.PESSOAL,
        },
        status: {
          not: InventoryStatus.ARQUIVADO,
        },
        owner: {
          eventParticipations: {
            some: {
              eventId,
              status: EventParticipationStatus.CONFIRMADO,
            },
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            role: true,
          },
        },
        cardDefinition: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyParticipation(eventId: string, userId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      select: {
        id: true,
        eventId: true,
        userId: true,
        status: true,
        parentalStatus: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return participation;
  }

  getMyParticipations(userId: string) {
    return this.prisma.eventParticipation.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        eventId: true,
        status: true,
        parentalStatus: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  private async generateUniqueSlug(input: string) {
    const baseSlug = input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);

    let candidate = baseSlug || 'evento';
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.event.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug || 'evento'}-${suffix}`;
    }
  }
}
