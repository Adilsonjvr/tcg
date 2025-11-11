import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { EventsApi } from '../api/events';
import type { EventsStackParamList } from '../navigation/types';
import type { InventoryItem } from '../api/inventory';

type RouteProps = NativeStackScreenProps<EventsStackParamList, 'AggregatedInventory'>['route'];

const AggregatedInventoryScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<EventsStackParamList, 'AggregatedInventory'>>();

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MENOR' | 'ADULTO' | 'RESPONSAVEL' | 'VENDEDOR' | 'ADMIN'>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', eventId, 'aggregated'],
    queryFn: () => EventsApi.fetchAggregatedInventory(eventId),
  });

  const filteredData = useMemo(() => {
    return (data ?? []).filter((item) => {
      const matchesRole = roleFilter === 'ALL' || item.owner?.role === roleFilter;
      const matchesSearch =
        !search.trim() ||
        item.cardDefinition.nome.toLowerCase().includes(search.toLowerCase()) ||
        item.owner?.nome.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [data, roleFilter, search]);

  const handleOwnerPress = (item: InventoryItem) => {
    if (!item.owner) {
      return;
    }
    Alert.alert('Contato do proprietário', `${item.owner.nome}\nFunção: ${item.owner.role}\nID: ${item.owner.id}`);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.cardDefinition.nome}</Text>
      <Pressable onPress={() => handleOwnerPress(item)}>
        <Text style={styles.owner}>
          Proprietário: {item.owner?.nome ?? 'Desconhecido'} ({item.owner?.role ?? 'N/A'}) — tocar para detalhes
        </Text>
      </Pressable>
      <View style={styles.tagRow}>
        <Text style={styles.tag}>{item.condition}</Text>
        <Text style={styles.tag}>{item.language}</Text>
        <Text style={styles.tag}>{item.visibility}</Text>
      </View>
      {item.precoVendaDesejado ? (
        <Text style={styles.price}>Preço: ${item.precoVendaDesejado.toFixed(2)}</Text>
      ) : null}
      {item.owner ? (
        <Pressable
          style={styles.proposeButton}
          onPress={() =>
            navigation.navigate('TradeProposal', {
              eventId,
              receiverId: item.owner!.id,
              receiverName: item.owner!.nome,
              cardId: item.id,
              cardName: item.cardDefinition.nome,
            })
          }
        >
          <Text style={styles.proposeLabel}>Propor troca</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Não foi possível carregar o inventário.</Text>
        <Text style={styles.retry} onPress={() => refetch()}>
          Tentar novamente
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.filters}>
        <TextInput
          placeholder="Pesquisar carta ou proprietário"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <View style={styles.filterRow}>
          {['ALL', 'MENOR', 'ADULTO', 'RESPONSAVEL', 'VENDEDOR', 'ADMIN'].map((role) => {
            const isActive = roleFilter === role;
            return (
              <Pressable
                key={role}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setRoleFilter(role as typeof roleFilter)}
              >
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {role === 'ALL' ? 'Todos' : role}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.empty}>
              {search ? 'Nenhum resultado encontrado para os filtros.' : 'Ninguém partilhou cartas para este evento ainda.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  filters: {
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterLabel: {
    color: '#475569',
    fontWeight: '500',
  },
  filterLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  owner: {
    color: '#4b5563',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  price: {
    fontWeight: '600',
  },
  proposeButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  proposeLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#ef4444',
    marginBottom: 8,
  },
  retry: {
    color: '#2563eb',
    fontWeight: '600',
  },
  empty: {
    color: '#6b7280',
  },
});

export default AggregatedInventoryScreen;
