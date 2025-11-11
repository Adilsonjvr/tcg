import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VendorApi } from '../api/vendor';
import { InventoryApi, InventoryItem } from '../api/inventory';
import { colors } from '../theme/colors';
import Surface from '../components/Surface';

const VendorDashboardScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [salePrice, setSalePrice] = React.useState('');
  const [modalVisible, setModalVisible] = React.useState(false);
  const [loadingInventory, setLoadingInventory] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vendor', 'dashboard'],
    queryFn: VendorApi.fetchDashboard,
  });

  const filteredInventory = React.useMemo(
    () => inventory.filter((item) => item.status !== 'VENDIDO'),
    [inventory],
  );

  const loadInventory = async () => {
    setLoadingInventory(true);
    try {
      const items = await InventoryApi.fetchMyInventory();
      setInventory(items ?? []);
    } finally {
      setLoadingInventory(false);
    }
  };

  const quickSale = useMutation({
    mutationFn: ({ itemId, price }: { itemId: string; price: number }) =>
      VendorApi.createQuickSale(itemId, price),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'dashboard'] });
      setInventory((prev) => prev.filter((item) => item.id !== variables.itemId));
      setModalVisible(false);
      setSelectedItem(null);
      setSalePrice('');
      Alert.alert('Venda registada', 'A carta foi marcada como vendida.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar a venda';
      Alert.alert('Erro', message);
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Não foi possível carregar o dashboard.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.statsGrid}>
          <Surface style={styles.statCard}>
            <Text style={styles.statLabel}>Vendas totais</Text>
            <Text style={styles.statValue}>{data.totalSales}</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statLabel}>Receita</Text>
            <Text style={styles.statValue}>${data.totalRevenue.toFixed(2)}</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statLabel}>Trocas concluídas</Text>
            <Text style={styles.statValue}>{data.tradesCompleted}</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statLabel}>Cartas disponíveis</Text>
            <Text style={styles.statValue}>{data.availableInventory}</Text>
          </Surface>
        </View>

        <Surface>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Inventário disponível</Text>
              <Text style={styles.helperText}>Toque numa carta para registar uma venda rápida.</Text>
            </View>
            <Pressable style={styles.linkButton} onPress={loadInventory} disabled={loadingInventory}>
              <Text style={styles.linkLabel}>{loadingInventory ? 'A carregar...' : inventory.length ? 'Atualizar' : 'Carregar'}</Text>
            </Pressable>
          </View>
          {loadingInventory && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          {!loadingInventory && filteredInventory.length === 0 ? (
            <Text style={styles.helperText}>Carregue o inventário para preparar vendas rápidas.</Text>
          ) : (
            <FlatList
              data={filteredInventory}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.inventoryList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.inventoryCard}
                  onPress={() => {
                    setSelectedItem(item);
                    setSalePrice('');
                    setModalVisible(true);
                  }}
                  disabled={quickSale.isPending}
                >
                  <Text style={styles.itemName}>{item.cardDefinition.nome}</Text>
                  <Text style={styles.itemMeta}>{item.cardDefinition.setName ?? item.cardDefinition.serie ?? 'Coleção desconhecida'}</Text>
                  <Text style={styles.quickSaleHint}>Venda rápida</Text>
                </Pressable>
              )}
            />
          )}
        </Surface>

        <Surface>
          <Text style={styles.sectionTitle}>Vendas recentes</Text>
          {data.recentSales.length > 0 ? (
            data.recentSales.map((item) => (
              <View key={item.id} style={styles.saleItem}>
                <Text style={styles.saleTitle}>{item.inventoryItem.cardDefinition.nome}</Text>
                <Text style={styles.saleSubtitle}>
                  ${item.precoVenda.toFixed(2)} • {new Date(item.vendidoEm).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.helperText}>Sem vendas recentes.</Text>
          )}
        </Surface>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard}>
            <Text style={styles.modalTitle}>Venda rápida</Text>
            <Text style={styles.modalSubtitle}>{selectedItem?.cardDefinition.nome}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Preço de venda"
              keyboardType="decimal-pad"
              value={salePrice}
              onChangeText={setSalePrice}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.secondaryButton, styles.modalButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.secondaryLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, styles.modalButton, quickSale.isPending && styles.buttonDisabled]}
                onPress={() => {
                  if (!selectedItem) return;
                  const price = Number.parseFloat(salePrice);
                  if (Number.isNaN(price) || price <= 0) {
                    Alert.alert('Preço inválido', 'Informe um valor maior que zero.');
                    return;
                  }
                  quickSale.mutate({ itemId: selectedItem.id, price });
                }}
                disabled={quickSale.isPending}
              >
                <Text style={styles.primaryLabel}>{quickSale.isPending ? 'A guardar...' : 'Confirmar'}</Text>
              </Pressable>
            </View>
          </Surface>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  linkButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  linkLabel: {
    fontWeight: '600',
    color: colors.primary,
  },
  loadingRow: {
    paddingVertical: 12,
  },
  inventoryList: {
    paddingVertical: 4,
  },
  inventoryCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  quickSaleHint: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  saleItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  saleTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  saleSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    color: colors.textMuted,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.surfaceMuted,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: colors.danger,
    fontWeight: '600',
  },
});

export default VendorDashboardScreen;
