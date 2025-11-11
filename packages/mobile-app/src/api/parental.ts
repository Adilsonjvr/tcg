import api from './api';
import type { ParentalApprovalStatus } from './events';
import type { TradeStatus } from './trading';
import type { UserRole } from '../store/authStore';

export interface PendingEventApproval {
  id: string;
  status: 'PENDENTE_APROVACAO_PARENTAL';
  parentalStatus: 'PENDENTE';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nome: string;
  };
  event: {
    id: string;
    titulo: string;
    startAt: string;
    endAt: string;
    venueName?: string | null;
  };
}

export interface ParentalDecisionPayload {
  note?: string;
}

export interface PendingTradeApproval {
  id: string;
  status: ParentalApprovalStatus;
  decisionAt?: string | null;
  decisionNote?: string | null;
  createdAt: string;
  trade: {
    id: string;
    status: TradeStatus;
    event?: {
      id: string;
      titulo: string;
      startAt: string;
    } | null;
    proponente: {
      id: string;
      nome: string;
    };
    recetor: {
      id: string;
      nome: string;
    };
  };
}

export interface DependentSummary {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  inventoryCount: number;
  pendingEvents: Array<{
    id: string;
    createdAt: string;
    event: {
      id: string;
      titulo: string;
      startAt: string;
    };
  }>;
  pendingTrades: Array<{
    id: string;
    status: ParentalApprovalStatus;
    createdAt: string;
    trade: {
      id: string;
      status: TradeStatus;
      event?: {
        titulo: string;
      } | null;
    };
  }>;
}

export interface ParentalDashboard {
  dependents: DependentSummary[];
}

export const ParentalApi = {
  async listPendingEventApprovals(): Promise<PendingEventApproval[]> {
    const { data } = await api.get<PendingEventApproval[]>('/parental/events/pending');
    return data;
  },

  async approveEvent(participationId: string, payload?: ParentalDecisionPayload): Promise<PendingEventApproval> {
    const { data } = await api.post<PendingEventApproval>(`/parental/events/${participationId}/approve`, payload ?? {});
    return data;
  },

  async rejectEvent(participationId: string, payload?: ParentalDecisionPayload): Promise<PendingEventApproval> {
    const { data } = await api.post<PendingEventApproval>(`/parental/events/${participationId}/reject`, payload ?? {});
    return data;
  },

  async listPendingTradeApprovals(): Promise<PendingTradeApproval[]> {
    const { data } = await api.get<PendingTradeApproval[]>('/parental/trades/pending');
    return data;
  },

  async approveTrade(approvalId: string, payload?: ParentalDecisionPayload): Promise<PendingTradeApproval> {
    const { data } = await api.post<PendingTradeApproval>(`/parental/trades/${approvalId}/approve`, payload ?? {});
    return data;
  },

  async rejectTrade(approvalId: string, payload?: ParentalDecisionPayload): Promise<PendingTradeApproval> {
    const { data } = await api.post<PendingTradeApproval>(`/parental/trades/${approvalId}/reject`, payload ?? {});
    return data;
  },

  async fetchDashboard(): Promise<ParentalDashboard> {
    const { data } = await api.get<ParentalDashboard>('/parental/dashboard');
    return data;
  },
};
