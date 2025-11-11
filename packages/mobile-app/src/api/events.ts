import api from './api';
import type { InventoryItem } from './inventory';

export type EventParticipationStatus =
  | 'PENDENTE_UTILIZADOR'
  | 'PENDENTE_APROVACAO_PARENTAL'
  | 'CONFIRMADO'
  | 'REJEITADO'
  | 'CANCELADO';

export type ParentalApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | null;

export interface EventSummary {
  id: string;
  slug: string;
  titulo: string;
  descricao?: string | null;
  venueName?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  startAt: string;
  endAt: string;
}

export interface EventParticipation {
  id: string;
  eventId: string;
  userId: string;
  status: EventParticipationStatus;
  parentalStatus: ParentalApprovalStatus;
  updatedAt: string;
  createdAt?: string;
}

export const EventsApi = {
  async listValidated(): Promise<EventSummary[]> {
    const { data } = await api.get<EventSummary[]>('/events/validated');
    return data;
  },

  async confirmPresence(eventId: string): Promise<EventParticipation> {
    const { data } = await api.post<EventParticipation>(`/events/${eventId}/confirm-presence`);
    return data;
  },

  async fetchAggregatedInventory(eventId: string): Promise<InventoryItem[]> {
    const { data } = await api.get<InventoryItem[]>(`/events/${eventId}/aggregated-inventory`);
    return data;
  },

  async fetchMyParticipation(eventId: string): Promise<EventParticipation | null> {
    const { data } = await api.get<EventParticipation | null>(`/events/${eventId}/my-participation`);
    return data;
  },

  async fetchMyParticipations(): Promise<EventParticipation[]> {
    const { data } = await api.get<EventParticipation[]>('/events/me/participations');
    return data;
  },
};
