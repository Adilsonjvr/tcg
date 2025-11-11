import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventsStackParamList } from '../navigation/types';
import { InventoryApi } from '../api/inventory';
import { TradingApi, type ProposeTradePayload } from '../api/trading';

type Props = NativeStackScreenProps<EventsStackParamList, 'TradeProposal'>;

const TradeProposalScreen: React.FC<Props> = ({ route, navigation }) => {
  const queryClient = useQueryClient();
  const { eventId, receiverId, receiverName, cardId, cardName } = route.params;
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', 'me', 'for-trade'],
    queryFn: InventoryApi.fetchMyInventory,
  });

  const mutation = useMutation({
    mutationFn: (payload: ProposeTradePayload) => TradingApi.proposeTrade(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'me'] });
      Alert.alert('Troca proposta', 'Aguarde a resposta do outro participante.');
      navigation.goBack();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível propor a troca';
      Alert.alert('Erro', message);
    },
  });

  const selectedIds = useMemo(() => Object.keys(selectedItems).filter((id) => selectedItems[id]), [selectedItems]);

  const toggleSelection = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSubmit = () => {
    if (!selectedIds.length) {
      Alert.alert('Selecione cartas', 'Escolha pelo menos uma carta do seu inventário.');
      return;
    }

    const payload: ProposeTradePayload = {
      eventId,
      recetorId: receiverId,
      proponenteItemIds: selectedIds,
      recetorItemIds: cardId ? [cardId] : [],
    };

    mutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>A carregar inventário...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Não foi possível carregar o inventário.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destinatário</Text>
        <Text>{receiverName}</Text>
        {cardName ? <Text>Carta selecionada: {cardName}</Text> : null}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Escolha as suas cartas</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = Boolean(selectedItems[item.id]);
          return (
            <Pressable style={[styles.card, selected && styles.cardSelected]} onPress={() => toggleSelection(item.id)}>
              <Text style={styles.cardTitle}>{item.cardDefinition.nome}</Text>
              <Text style={styles.cardSubtitle}>{item.cardDefinition.setName ?? 'Set desconhecido'}</Text>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.footer}>
        <Pressable style={[styles.submitButton, mutation.isPending && styles.buttonDisabled]} onPress={handleSubmit}>
          <Text style={styles.submitLabel}>{mutation.isPending ? 'A enviar...' : 'Enviar proposta'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  cardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#4b5563',
  },
  footer: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TradeProposalScreen;
