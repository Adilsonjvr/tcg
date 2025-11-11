import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventsStackParamList } from '../navigation/types';
import { EventsApi } from '../api/events';
import useAuthStore from '../store/authStore';

type DetailProps = NativeStackScreenProps<EventsStackParamList, 'EventDetail'>;
type EventsNav = NativeStackNavigationProp<EventsStackParamList, 'EventDetail'>;

const EventDetailScreen: React.FC = () => {
  const route = useRoute<DetailProps['route']>();
  const navigation = useNavigation<EventsNav>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { event } = route.params;
  const start = new Date(event.startAt).toLocaleString();
  const end = new Date(event.endAt).toLocaleString();
  const location = [event.venueName, event.city, event.state, event.country].filter(Boolean).join(', ');

  const { data: participation } = useQuery({
    queryKey: ['events', event.id, 'participation'],
    queryFn: () => EventsApi.fetchMyParticipation(event.id),
    enabled: Boolean(user),
  });

  const confirmPresence = useMutation({
    mutationFn: () => EventsApi.confirmPresence(event.id),
    onSuccess: () => {
      Alert.alert('Confirmação enviada', 'Vamos avisar quando a presença estiver confirmada.');
      queryClient.invalidateQueries({ queryKey: ['events', 'validated'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my-participations'] });
      queryClient.invalidateQueries({ queryKey: ['events', event.id, 'participation'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível confirmar presença';
      Alert.alert('Erro', message);
    },
  });

  const statusInfo = useMemo(() => {
    if (!participation) {
      return null;
    }

    if (participation.status === 'CONFIRMADO') {
      return {
        title: 'Presença confirmada',
        description: 'Está tudo pronto para o evento! Pode gerir o inventário partilhado.',
        style: styles.noticeSuccess,
        buttonDisabled: true,
      };
    }

    if (participation.status === 'PENDENTE_APROVACAO_PARENTAL') {
      const description =
        user?.role === 'MENOR'
          ? 'Estamos a aguardar a aprovação do seu responsável. Assim que aprovado, notificaremos.'
          : 'O responsável ainda precisa aprovar a participação deste menor.';
      return {
        title: 'Aguardando aprovação',
        description,
        style: styles.noticeWarning,
        buttonDisabled: true,
      };
    }

    return {
      title: 'Estado da participação',
      description: participation.status.replace(/_/g, ' ').toLowerCase(),
      style: styles.noticeNeutral,
      buttonDisabled: false,
    };
  }, [participation, user?.role]);

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{event.titulo}</Text>
        <Text style={styles.date}>{start}</Text>
        <Text style={styles.date}>até {end}</Text>
        {location ? <Text style={styles.location}>{location}</Text> : null}
        <View style={[styles.notice, styles.noticeNeutral]}>
          <Text style={styles.noticeTitle}>Sessão autenticada necessária</Text>
          <Text style={styles.noticeDescription}>Entre na sua conta para confirmar presença neste evento.</Text>
        </View>
      </ScrollView>
    );
  }

  const disableButton = confirmPresence.isPending || Boolean(statusInfo?.buttonDisabled);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{event.titulo}</Text>
      <Text style={styles.date}>{start}</Text>
      <Text style={styles.date}>até {end}</Text>
      {location ? <Text style={styles.location}>{location}</Text> : null}

      {event.descricao ? <Text style={styles.description}>{event.descricao}</Text> : null}

      {statusInfo ? (
        <View style={[styles.notice, statusInfo.style]}>
          <Text style={styles.noticeTitle}>{statusInfo.title}</Text>
          <Text style={styles.noticeDescription}>{statusInfo.description}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryButton, disableButton && styles.buttonDisabled]}
          onPress={() => confirmPresence.mutate()}
          disabled={disableButton}
        >
          <Text style={styles.primaryLabel}>{confirmPresence.isPending ? 'Enviando...' : 'Confirmar Presença'}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('AggregatedInventory', { eventId: event.id, eventTitle: event.titulo })}
        >
          <Text style={styles.secondaryLabel}>Inventário agregado</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  date: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  location: {
    color: '#6b7280',
    marginTop: 4,
  },
  description: {
    marginTop: 12,
    color: '#374151',
    lineHeight: 22,
  },
  notice: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  noticeTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  noticeDescription: {
    color: '#1f2937',
    lineHeight: 20,
  },
  noticeSuccess: {
    backgroundColor: '#dcfce7',
  },
  noticeWarning: {
    backgroundColor: '#fef3c7',
  },
  noticeNeutral: {
    backgroundColor: '#e5e7eb',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 999,
  },
  primaryLabel: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 12,
  },
  secondaryLabel: {
    color: '#2563eb',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EventDetailScreen;
