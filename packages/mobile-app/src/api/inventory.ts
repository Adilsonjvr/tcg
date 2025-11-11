import type { UserRole } from '../store/authStore';
import api from './api';

export interface CardDefinition {
  id: string;
  nome: string;
  serie?: string | null;
  setName?: string | null;
  setCode?: string | null;
  collectorNumber?: string | null;
  rarity?: string | null;
  smallImageUrl?: string | null;
  largeImageUrl?: string | null;
}

export type InventoryVisibility = 'PESSOAL' | 'EVENTO' | 'PUBLICO';
export type InventoryStatus = 'DISPONIVEL' | 'EM_PROPOSTA' | 'VENDIDO' | 'ARQUIVADO';
export type CardCondition =
  | 'MINT'
  | 'NEAR_MINT'
  | 'EXCELLENT'
  | 'GOOD'
  | 'LIGHT_PLAYED'
  | 'PLAYED'
  | 'POOR';
export type CardLanguage = 'EN' | 'PT' | 'ES' | 'FR' | 'DE' | 'IT' | 'JA' | 'KO' | 'ZH' | 'OTHER';

export interface InventoryItem {
  id: string;
  ownerId: string;
  cardDefinitionId: string;
  condition: CardCondition;
  language: CardLanguage;
  quantity: number;
  visibility: InventoryVisibility;
  status: InventoryStatus;
  precoVendaDesejado?: number | null;
  valorEstimado?: number | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
  cardDefinition: CardDefinition;
  owner?: {
    id: string;
    nome: string;
    role: UserRole;
  };
}

export interface CreateInventoryPayload {
  cardDefinitionId: string;
  condition: CardCondition;
  language: CardLanguage;
  quantity?: number;
  visibility?: InventoryVisibility;
  aquisicaoFonte?: string;
  precoCompra?: number;
  precoVendaDesejado?: number;
  valorEstimado?: number;
  observacoes?: string;
}

export interface CardSearchFilters {
  name?: string;
  supertype?: string;
  rarity?: string;
  setId?: string;
  setName?: string;
  setSeries?: string;
  regulationMark?: string;
  text?: string;
  types?: string[];
  subtypes?: string[];
  page?: number;
  pageSize?: number;
  orderBy?: string;
  select?: string[];
}

export interface CardSearchResultItem {
  id: string;
  name: string;
  setName?: string | null;
  imageUrl?: string | null;
}

export interface CardSearchResponse {
  data: CardSearchResultItem[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export const InventoryApi = {
  async fetchMyInventory(): Promise<InventoryItem[]> {
    const { data } = await api.get<InventoryItem[]>('/inventory/me');
    return data;
  },

  async createInventoryItem(payload: CreateInventoryPayload): Promise<InventoryItem> {
    const { data } = await api.post<InventoryItem>('/inventory', payload);
    return data;
  },

  async searchCards(filters: CardSearchFilters): Promise<CardSearchResponse> {
    const params = {
      ...filters,
      types: filters.types?.join(','),
      subtypes: filters.subtypes?.join(','),
      select: filters.select?.join(','),
    };
    const { data } = await api.get<CardSearchResponse>('/inventory/cards/search', { params });
    return data;
  },

  async scanInventory(imageBase64: string) {
    const { data } = await api.post('/inventory/scan', { imageBase64 });
    return data as Array<{
      label: string;
      cardDefinitionId?: string;
      confidence?: number;
    }>;
  },
};
