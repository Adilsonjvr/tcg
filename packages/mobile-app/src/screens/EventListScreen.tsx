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
import { EventsApi, type EventSummary } from '../api/events';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { EventsStackParamList } from '../navigation/types';
import useAuthStore from '../store/authStore';

type EventsNav = NativeStackNavigationProp<EventsStackParamList, 'EventList'>;

const EventListScreen: React.FC = () => {
  const navigation = useNavigation<EventsNav>();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', 'validated'],
    queryFn: EventsApi.listValidated,
  });

  const { data: participationData } = useQuery({
    queryKey: ['events', 'my-participations'],
    queryFn: EventsApi.fetchMyParticipations,
    enabled: Boolean(user),
  });

  const statusMap = useMemo(() => {
    if (!participationData) {
      return {};
    }
    return participationData.reduce<Record<string, { status: string; parentalStatus: string | null }>>((acc, participation) => {
      acc[participation.eventId] = {
        status: participation.status,
        parentalStatus: participation.parentalStatus ?? null,
      };
      return acc;
    }, {});
  }, [participationData]);

  const renderStatusBadge = (eventId: string) => {
    const entry = statusMap[eventId];
    if (!entry) {
      return null;
    }

    let label = entry.status.replace(/_/g, ' ').toLowerCase();
    let style = styles.badgeNeutral;

    if (entry.status === 'CONFIRMADO') {
      label = 'Confirmado';
      style = styles.badgeSuccess;
    } else if (entry.status === 'PENDENTE_APROVACAO_PARENTAL') {
      label =
        entry.parentalStatus === 'REJEITADO'
          ? 'Rejeitado pelo responsável'
          : 'Aguardando responsável';
      style = entry.parentalStatus === 'REJEITADO' ? styles.badgeDanger : styles.badgeWarning;
    }

    return (
      <View style={[styles.badge, style]}>
        <Text style={styles.badgeLabel}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: EventSummary }) => {
    const start = new Date(item.startAt).toLocaleString();
    const location = [item.city, item.state, item.country].filter(Boolean).join(', ');

    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate('EventDetail', { event: item })}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.titulo}</Text>
          {renderStatusBadge(item.id)}
        </View>
        <Text style={styles.date}>{start}</Text>
        {location ? <Text style={styles.location}>{location}</Text> : null}
        {item.descricao ? <Text numberOfLines={2} style={styles.description}>{item.descricao}</Text> : null}
      </Pressable>
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
        <Text style={styles.error}>Não foi possível carregar os eventos.</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryLabel}>Tentar novamente</Text>
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
            <Text style={styles.emptyText}>Nenhum evento validado no momento.</Text>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  badgeSuccess: {
    backgroundColor: '#16a34a',
  },
  badgeWarning: {
    backgroundColor: '#d97706',
  },
  badgeDanger: {
    backgroundColor: '#dc2626',
  },
  badgeNeutral: {
    backgroundColor: '#6b7280',
  },
  date: {
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 4,
  },
  location: {
    color: '#6b7280',
    marginBottom: 8,
  },
  description: {
    color: '#374151',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  error: {
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
    color: '#fff',
    fontWeight: '600',
  },
});

export default EventListScreen;
