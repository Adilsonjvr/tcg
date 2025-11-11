import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Surface from '../components/Surface';
import { ParentalApi, type DependentSummary } from '../api/parental';
import { colors } from '../theme/colors';
import useAuthStore from '../store/authStore';

type Decision = 'approve' | 'reject';

const ParentalDashboardScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isGuardian = user?.role === 'RESPONSAVEL';

  const [processing, setProcessing] = React.useState<{ type: 'event' | 'trade'; id: string } | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['parental', 'dashboard'],
    queryFn: ParentalApi.fetchDashboard,
    enabled: isGuardian,
  });

  const eventDecision = useMutation({
    mutationFn: ({ participationId, decision }: { participationId: string; decision: Decision }) =>
      decision === 'approve'
        ? ParentalApi.approveEvent(participationId)
        : ParentalApi.rejectEvent(participationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parental', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parental', 'events', 'pending'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a participação';
      Alert.alert('Erro', message);
    },
  });

  const tradeDecision = useMutation({
    mutationFn: ({ approvalId, decision }: { approvalId: string; decision: Decision }) =>
      decision === 'approve'
        ? ParentalApi.approveTrade(approvalId)
        : ParentalApi.rejectTrade(approvalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parental', 'dashboard'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a troca';
      Alert.alert('Erro', message);
    },
  });

  const handleEventDecision = (participationId: string, decision: Decision) => {
    setProcessing({ type: 'event', id: participationId });
    eventDecision.mutate(
      { participationId, decision },
      {
        onSettled: () => setProcessing(null),
      },
    );
  };

  const handleTradeDecision = (approvalId: string, decision: Decision) => {
    setProcessing({ type: 'trade', id: approvalId });
    tradeDecision.mutate(
      { approvalId, decision },
      {
        onSettled: () => setProcessing(null),
      },
    );
  };

  if (!isGuardian) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Surface tone="muted" alignCenter>
            <Text style={styles.sectionTitle}>Acesso restrito</Text>
            <Text style={styles.helperTextCenter}>Apenas responsáveis com KYC aprovado podem abrir este painel.</Text>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Surface tone="danger" alignCenter>
            <Text style={styles.errorText}>Não foi possível carregar o dashboard.</Text>
            <Pressable style={[styles.primaryButton, styles.fullWidthButton]} onPress={() => refetch()}>
              <Text style={styles.primaryLabel}>Tentar novamente</Text>
            </Pressable>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  const dependents = data.dependents;
  const totalPendingEvents = dependents.reduce((sum, child) => sum + child.pendingEvents.length, 0);
  const totalPendingTrades = dependents.reduce((sum, child) => sum + child.pendingTrades.length, 0);

  const renderDependents = () => {
    if (dependents.length === 0) {
      return (
        <Surface tone="muted" alignCenter>
          <Text style={styles.sectionTitle}>Sem dependentes ligados</Text>
          <Text style={styles.helperTextCenter}>Peça ao menor para enviar um novo código de ligação no perfil.</Text>
        </Surface>
      );
    }

    return dependents.map((child) => (
      <Surface key={child.id} style={styles.dependentCard}>
        <View style={styles.dependentHeader}>
          <View>
            <Text style={styles.dependentName}>{child.nome}</Text>
            <Text style={styles.dependentEmail}>{child.email}</Text>
          </View>
          <Surface tone="muted" padding={10} style={styles.inventoryBadge} alignCenter>
            <Text style={styles.inventoryCount}>{child.inventoryCount}</Text>
            <Text style={styles.inventoryLabel}>cartas</Text>
          </Surface>
        </View>

        {child.pendingEvents.length > 0 ? (
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>Eventos pendentes</Text>
            {child.pendingEvents.map((item) => {
              const start = new Date(item.event.startAt).toLocaleString();
              const busy = processing?.type === 'event' && processing.id === item.id;
              return (
                <View key={item.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestTitle}>{item.event.titulo}</Text>
                    <Text style={styles.requestMeta}>Início: {start}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                      onPress={() => handleEventDecision(item.id, 'reject')}
                      disabled={busy}
                    >
                      <Text style={styles.secondaryLabel}>Rejeitar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryButton, busy && styles.buttonDisabled]}
                      onPress={() => handleEventDecision(item.id, 'approve')}
                      disabled={busy}
                    >
                      <Text style={styles.primaryLabel}>Aprovar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {child.pendingTrades.length > 0 ? (
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>Trocas pendentes</Text>
            {child.pendingTrades.map((approval) => {
              const busy = processing?.type === 'trade' && processing.id === approval.id;
              const tradeTitle = approval.trade.event?.titulo ?? `Troca ${approval.trade.id.slice(-4)}`;
              return (
                <View key={approval.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestTitle}>{tradeTitle}</Text>
                    <Text style={styles.requestMeta}>Estado: {approval.trade.status.replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                      onPress={() => handleTradeDecision(approval.id, 'reject')}
                      disabled={busy}
                    >
                      <Text style={styles.secondaryLabel}>Rejeitar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryButton, busy && styles.buttonDisabled]}
                      onPress={() => handleTradeDecision(approval.id, 'approve')}
                      disabled={busy}
                    >
                      <Text style={styles.primaryLabel}>Aprovar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {child.pendingEvents.length === 0 && child.pendingTrades.length === 0 ? (
          <Text style={styles.helperText}>Sem aprovações pendentes.</Text>
        ) : null}
      </Surface>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
      >
        <Text style={styles.heading}>Dashboard Parental</Text>

        <View style={styles.summaryRow}>
          <Surface alignCenter style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Dependentes</Text>
            <Text style={styles.summaryValue}>{dependents.length}</Text>
          </Surface>
          <Surface alignCenter style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Eventos</Text>
            <Text style={styles.summaryValue}>{totalPendingEvents}</Text>
          </Surface>
          <Surface alignCenter style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Trocas</Text>
            <Text style={styles.summaryValue}>{totalPendingTrades}</Text>
          </Surface>
        </View>

        {renderDependents()}
      </ScrollView>
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
    justifyContent: 'center',
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  helperText: {
    color: colors.textMuted,
    marginTop: 8,
  },
  helperTextCenter: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  dependentCard: {
    gap: 12,
  },
  dependentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dependentName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  dependentEmail: {
    color: colors.textMuted,
  },
  inventoryBadge: {
    minWidth: 72,
  },
  inventoryCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  inventoryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  subSection: {
    marginTop: 4,
    gap: 8,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: colors.surfaceMuted,
  },
  requestInfo: {
    gap: 4,
  },
  requestTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  requestMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fullWidthButton: {
    marginTop: 12,
  },
  errorText: {
    color: colors.danger,
    fontWeight: '600',
    marginBottom: 8,
  },
});

export default ParentalDashboardScreen;
