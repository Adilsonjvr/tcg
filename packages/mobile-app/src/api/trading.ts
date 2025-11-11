import api from './api';
import type { InventoryItem } from './inventory';

export type TradeStatus =
  | 'PENDENTE_UTILIZADOR'
  | 'PENDENTE_APROVACAO_PARENTAL'
  | 'ACEITE'
  | 'REJEITADO'
  | 'CANCELADA'
  | 'CONCLUIDA';

export interface Trade {
  id: string;
  eventId: string;
  proponenteId: string;
  recetorId: string;
  status: TradeStatus;
  proponenteDinheiro?: string | null;
  recetorDinheiro?: string | null;
  avaliacaoProponente?: string | null;
  avaliacaoRecetor?: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  chatChannelId?: string | null;
  proponenteHandshakeAt?: string | null;
  recetorHandshakeAt?: string | null;
  event?: {
    id: string;
    titulo: string;
    startAt: string;
  };
  items: Array<{
    id: string;
    side: 'PROPONENTE' | 'RECETOR';
    valuation?: string | null;
    inventoryItem: InventoryItem;
  }>;
}

export const TradingApi = {
  async fetchMyTrades(): Promise<Trade[]> {
    const { data } = await api.get<Trade[]>('/trading/me');
    return data;
  },

  async fetchTrade(tradeId: string): Promise<Trade> {
    const { data } = await api.get<Trade>(`/trading/${tradeId}`);
    return data;
  },

  async acceptTrade(tradeId: string): Promise<Trade> {
    const { data } = await api.post<Trade>(`/trading/${tradeId}/accept`);
    return data;
  },

  async confirmHandshake(tradeId: string): Promise<Trade> {
    const { data } = await api.post<Trade>(`/trading/${tradeId}/confirm-handshake`);
    return data;
  },

  async cancelTrade(tradeId: string): Promise<Trade> {
    const { data } = await api.post<Trade>(`/trading/${tradeId}/cancel`);
    return data;
  },

  async rejectTrade(tradeId: string): Promise<Trade> {
    const { data } = await api.post<Trade>(`/trading/${tradeId}/reject`);
    return data;
  },

  async proposeTrade(payload: ProposeTradePayload): Promise<Trade> {
    const { data } = await api.post<Trade>('/trading/propose', payload);
    return data;
  },
};

export interface ProposeTradePayload {
  eventId: string;
  recetorId: string;
  proponenteItemIds: string[];
  recetorItemIds: string[];
  proponenteDinheiro?: number;
  recetorDinheiro?: number;
}
