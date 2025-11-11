import api from './api';

export interface VendorDashboard {
  totalSales: number;
  totalRevenue: number;
  tradesCompleted: number;
  availableInventory: number;
  recentSales: Array<{
    id: string;
    precoVenda: number;
    vendidoEm: string;
    inventoryItem: {
      id: string;
      cardDefinition: {
        nome: string;
        setName?: string | null;
      };
    };
  }>;
}

export const VendorApi = {
  async fetchDashboard(): Promise<VendorDashboard> {
    const { data } = await api.get<VendorDashboard>('/vendor/dashboard');
    return data;
  },

  async createQuickSale(inventoryItemId: string, precoVenda: number) {
    const { data } = await api.post('/vendor/quick-sale', {
      inventoryItemId,
      precoVenda,
    });
    return data;
  },
};
