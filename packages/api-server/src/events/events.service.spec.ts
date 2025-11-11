import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from '../api-services/firebase-admin.service';
import {
  EventStatus,
  UserRole,
  EventParticipationStatus,
  ParentalApprovalStatus,
} from '@prisma/client';
import { ActiveUser } from '../auth/types/active-user.interface';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: {
    event: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    eventParticipation: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    inventoryItem: {
      findMany: jest.Mock;
    };
  };
  let firebase: { notifyGuardianPendingEvent: jest.Mock };

  beforeEach(async () => {
    prisma = {
      event: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      eventParticipation: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      inventoryItem: {
        findMany: jest.fn(),
      },
    };

    firebase = {
      notifyGuardianPendingEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FirebaseAdminService, useValue: firebase },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('creates an event when host is verified', async () => {
    const host: ActiveUser = {
      id: 'host-1',
      email: 'host@example.com',
      role: UserRole.VENDEDOR,
      isKycVerified: true,
      responsavelId: null,
    };

    prisma.event.findUnique.mockResolvedValueOnce(null);
    prisma.event.create.mockImplementation(async ({ data }) => ({
      id: 'event-1',
      ...data,
      status: EventStatus.PENDENTE_VALIDACAO,
    }));

    const dto = {
      titulo: 'Poké Meetup',
      descricao: 'Trocas semanais',
      startAt: new Date('2025-01-10T10:00:00Z').toISOString(),
      endAt: new Date('2025-01-10T12:00:00Z').toISOString(),
      capacidade: 50,
    };

    const result = await service.createEvent(host, dto);

    expect(prisma.event.create).toHaveBeenCalled();
    expect(result.titulo).toBe('Poké Meetup');
    expect(result.status).toBe(EventStatus.PENDENTE_VALIDACAO);
  });

  it('marks participation as pending for minors and notifies guardian', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      status: EventStatus.VALIDADO,
      titulo: 'Poké Meetup',
      startAt: new Date('2025-01-10T10:00:00Z'),
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.MENOR,
      responsavelId: 'guardian-1',
      responsavel: {
        id: 'guardian-1',
      },
    });

    prisma.eventParticipation.findUnique.mockResolvedValue(null);
    prisma.eventParticipation.upsert.mockResolvedValue({
      id: 'participation-1',
      status: EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL,
      parentalStatus: ParentalApprovalStatus.PENDENTE,
    });

    const participation = await service.confirmPresence('event-1', 'user-1');

    expect(prisma.eventParticipation.upsert).toHaveBeenCalled();
    expect(firebase.notifyGuardianPendingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        guardianId: 'guardian-1',
        eventId: 'event-1',
      }),
    );
    expect(participation.status).toBe(EventParticipationStatus.PENDENTE_APROVACAO_PARENTAL);
  });

  it('returns aggregated inventory for validated events', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      status: EventStatus.VALIDADO,
    });

    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        ownerId: 'user-1',
        cardDefinitionId: 'card-1',
        visibility: 'PUBLICO',
      },
    ]);

    const items = await service.getAggregatedInventory('event-1');

    expect(prisma.inventoryItem.findMany).toHaveBeenCalled();
    expect(items).toHaveLength(1);
  });

  it('returns the user participation for an event', async () => {
    prisma.eventParticipation.findUnique = jest.fn().mockResolvedValue({
      id: 'participation-1',
      eventId: 'event-1',
      userId: 'user-1',
      status: EventParticipationStatus.CONFIRMADO,
      parentalStatus: null,
    });

    const participation = await service.getMyParticipation('event-1', 'user-1');
    expect(participation?.status).toBe(EventParticipationStatus.CONFIRMADO);
  });

  it('lists all participations for a user', async () => {
    prisma.eventParticipation.findMany.mockResolvedValue([
      {
        id: 'p1',
        eventId: 'event-1',
        status: EventParticipationStatus.CONFIRMADO,
        parentalStatus: null,
        updatedAt: new Date(),
      },
    ]);

    const participations = await service.getMyParticipations('user-1');
    expect(participations).toHaveLength(1);
    expect(participations[0].eventId).toBe('event-1');
  });
});
