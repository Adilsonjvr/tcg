import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { InventoryApi, InventoryItem } from '../api/inventory';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '../navigation/types';

type InventoryNavigation = NativeStackNavigationProp<InventoryStackParamList, 'MyInventory'>;

const MyInventoryScreen: React.FC = () => {
  const navigation = useNavigation<InventoryNavigation>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory', 'me'],
    queryFn: InventoryApi.fetchMyInventory,
  });

  const totalCards = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  }, [data]);

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.cardDefinition.nome}</Text>
        <Text style={styles.cardQuantity}>x{item.quantity ?? 1}</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {item.cardDefinition.setName ?? item.cardDefinition.serie ?? 'Coleção desconhecida'} •{' '}
        {item.cardDefinition.collectorNumber ?? '—'}
      </Text>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.condition}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.language}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.visibility}</Text>
        </View>
      </View>
      {item.precoVendaDesejado ? (
        <Text style={styles.priceLabel}>
          Preço desejado: <Text style={styles.priceValue}>${item.precoVendaDesejado.toFixed(2)}</Text>
        </Text>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Inventário vazio</Text>
      <Text style={styles.emptyText}>Adicione a primeira carta para começar a construir o PokéBinder.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.heading}>Meu Inventário</Text>
        <View style={styles.headerActions}>
          <Text style={styles.counter}>{totalCards} cartas</Text>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddCard')}>
            <Text style={styles.addLabel}>+ Adicionar</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Não foi possível carregar o inventário.</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryLabel}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: '#6b7280',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  addLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  cardQuantity: {
    fontWeight: '700',
    color: '#2563eb',
  },
  cardSubtitle: {
    color: '#6b7280',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  priceLabel: {
    color: '#374151',
    fontWeight: '500',
  },
  priceValue: {
    fontWeight: '700',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default MyInventoryScreen;
