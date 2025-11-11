import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TradingApi, type Trade } from '../api/trading';
import useAuthStore from '../store/authStore';

const TradingScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trades', 'me'],
    queryFn: TradingApi.fetchMyTrades,
  });

  const acceptMutation = useMutation({
    mutationFn: TradingApi.acceptTrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades', 'me'] }),
  });

  const handshakeMutation = useMutation({
    mutationFn: TradingApi.confirmHandshake,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades', 'me'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: TradingApi.cancelTrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades', 'me'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: TradingApi.rejectTrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades', 'me'] }),
  });

  const renderItem = ({ item }: { item: Trade }) => {
    const isReceiver = user?.id === item.recetorId;
    const canAccept = item.status === 'PENDENTE_UTILIZADOR' && isReceiver;
    const canHandshake = item.status === 'ACEITE';
    const canCancel = !['CONCLUIDA', 'CANCELADA', 'REJEITADO'].includes(item.status);
    const canReject = item.status === 'PENDENTE_UTILIZADOR' && isReceiver;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.event?.titulo ?? 'Troca'}</Text>
        <Text style={styles.status}>{item.status.replace(/_/g, ' ')}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens do proponente</Text>
          {item.items
            .filter((tradeItem) => tradeItem.side === 'PROPONENTE')
            .map((tradeItem) => (
              <Text key={tradeItem.id} style={styles.itemText}>
                • {tradeItem.inventoryItem.cardDefinition.nome}
              </Text>
            ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens do recetor</Text>
          {item.items
            .filter((tradeItem) => tradeItem.side === 'RECETOR')
            .map((tradeItem) => (
              <Text key={tradeItem.id} style={styles.itemText}>
                • {tradeItem.inventoryItem.cardDefinition.nome}
              </Text>
            ))}
        </View>

        <View style={styles.actionsRow}>
          {canAccept && (
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => acceptMutation.mutate(item.id)}
              disabled={acceptMutation.isPending}
            >
              <Text style={styles.buttonLabel}>{acceptMutation.isPending ? 'A aceitar...' : 'Aceitar'}</Text>
            </Pressable>
          )}
          {canHandshake && (
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handshakeMutation.mutate(item.id)}
              disabled={handshakeMutation.isPending}
            >
              <Text style={styles.secondaryLabel}>
                {handshakeMutation.isPending ? 'A confirmar...' : 'Confirmar handshake'}
              </Text>
            </Pressable>
          )}
          {canReject && (
            <Pressable
              style={[styles.button, styles.dangerButton]}
              onPress={() => rejectMutation.mutate(item.id)}
              disabled={rejectMutation.isPending}
            >
              <Text style={styles.buttonLabel}>{rejectMutation.isPending ? 'A rejeitar...' : 'Rejeitar'}</Text>
            </Pressable>
          )}
          {canCancel && (
            <Pressable
              style={[styles.button, styles.dangerButton]}
              onPress={() => cancelMutation.mutate(item.id)}
              disabled={cancelMutation.isPending}
            >
              <Text style={styles.buttonLabel}>
                {cancelMutation.isPending ? 'A cancelar...' : 'Cancelar'}
              </Text>
            </Pressable>
          )}
          {item.status === 'ACEITE' && item.chatChannelId && (
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => Alert.alert('Canal do chat', `ID: ${item.chatChannelId}`)}
            >
              <Text style={styles.secondaryLabel}>Abrir chat</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

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
        <Text style={styles.error}>Não foi possível carregar as trocas.</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.buttonLabel}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.helperText}>Ainda não há trocas. Proponha uma a partir do inventário agregado.</Text>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  itemText: {
    color: '#374151',
  },
  actionsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryLabel: {
    color: '#2563eb',
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
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  helperText: {
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default TradingScreen;
