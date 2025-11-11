import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../api/api';
import useAuthStore from '../store/authStore';
import { ParentalApi, type PendingEventApproval } from '../api/parental';
import { colors } from '../theme/colors';
import Surface from '../components/Surface';
import PokeButton from '../components/PokeButton';
import PokeTextInput from '../components/PokeTextInput';
import type { AppTabParamList, ProfileStackParamList } from '../navigation/types';

type ProfileScreenNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>,
  BottomTabNavigationProp<AppTabParamList>
>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigation>();
  const queryClient = useQueryClient();
  const { user, clearAuth, updateUser } = useAuthStore((state) => state);

  const [linkCode, setLinkCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formattedRole = useMemo(() => {
    if (!user) {
      return '';
    }
    return user.role
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [user]);

  const shortUserId = useMemo(() => {
    if (!user) return '';
    return `#${user.id.slice(-6).toUpperCase()}`;
  }, [user]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    clearAuth();
  };

  const handleLinkAccount = async () => {
    if (linkCode.trim().length !== 8) {
      Alert.alert('Código inválido', 'O código deve ter 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/parental/link-account', {
        parentLinkCode: linkCode.trim().toUpperCase(),
      });
      updateUser({ requiresParentalLink: false });
      Alert.alert('Conta ligada', 'A conta do menor foi ligada com sucesso.');
      setLinkCode('');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'Não foi possível ligar a conta'
        : 'Erro inesperado ao ligar conta';
      Alert.alert('Erro', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const isGuardian = user.role === 'RESPONSAVEL';
  const awaitingGuardian = user.role === 'MENOR' && user.requiresParentalLink;
  const isVendor = user.role === 'VENDEDOR' || user.role === 'ADMIN';

  const {
    data: pendingEventApprovals,
    isLoading: loadingApprovals,
    isError: approvalsError,
  } = useQuery({
    queryKey: ['parental', 'events', 'pending'],
    queryFn: ParentalApi.listPendingEventApprovals,
    enabled: isGuardian,
  });

  const approveEvent = useMutation({
    mutationFn: (participationId: string) => ParentalApi.approveEvent(participationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parental', 'events', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my-participations'] });
      Alert.alert('Aprovação concluída', 'A presença do menor foi confirmada.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao aprovar participação';
      Alert.alert('Erro', message);
    },
  });

  const rejectEvent = useMutation({
    mutationFn: (participationId: string) => ParentalApi.rejectEvent(participationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parental', 'events', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my-participations'] });
      Alert.alert('Rejeição enviada', 'Notificámos o menor sobre a decisão.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao rejeitar participação';
      Alert.alert('Erro', message);
    },
  });

  const handleDecision = (participationId: string, decision: 'approve' | 'reject') => {
    if (decision === 'approve') {
      approveEvent.mutate(participationId);
    } else {
      rejectEvent.mutate(participationId);
    }
  };

  const renderPendingEvents = () => {
    if (loadingApprovals) {
      return (
        <View style={styles.approvalsState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (approvalsError) {
      return (
        <View style={styles.approvalsState}>
          <Text style={styles.errorText}>Não foi possível carregar as aprovações pendentes.</Text>
        </View>
      );
    }

    if (!pendingEventApprovals || pendingEventApprovals.length === 0) {
      return <Text style={styles.helperText}>Sem pedidos pendentes neste momento.</Text>;
    }

    const isMutating = approveEvent.isPending || rejectEvent.isPending;

    return pendingEventApprovals.map((item: PendingEventApproval) => {
      const start = new Date(item.event.startAt).toLocaleString();
      return (
        <View key={item.id} style={styles.approvalCard}>
          <View style={styles.approvalHeader}>
            <Text style={styles.approvalTitle}>{item.event.titulo}</Text>
            <Text style={styles.approvalDate}>{start}</Text>
          </View>
          <Text style={styles.approvalSub}>Menor: {item.user.nome}</Text>
          <View style={styles.approvalActions}>
            <View style={styles.approvalSlot}>
              <PokeButton
                variant="outline"
                label="Rejeitar"
                onPress={() => handleDecision(item.id, 'reject')}
                disabled={isMutating}
                loading={rejectEvent.isPending}
                fullWidth
              />
            </View>
            <View style={styles.approvalSlot}>
              <PokeButton
                label="Aprovar"
                onPress={() => handleDecision(item.id, 'approve')}
                disabled={isMutating}
                loading={approveEvent.isPending}
                fullWidth
              />
            </View>
          </View>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Surface padding={20} style={styles.heroCard}>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{formattedRole}</Text>
          </View>
          <Text style={styles.heroName}>{user.nome}</Text>
          <Text style={styles.heroEmail}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, user.isKycVerified ? styles.badgeSuccess : styles.badgeWarning]}>
              <Text style={styles.badgeText}>{user.isKycVerified ? 'KYC verificado' : 'KYC pendente'}</Text>
            </View>
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={styles.badgeText}>{shortUserId}</Text>
            </View>
          </View>
        </Surface>

        <Surface>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.detailLabel}>Papel</Text>
              <Text style={styles.detailValue}>{formattedRole}</Text>
            </View>
            <View>
              <Text style={styles.detailLabel}>KYC</Text>
              <Text style={[styles.detailValue, user.isKycVerified ? styles.textSuccess : styles.textWarning]}>
                {user.isKycVerified ? 'Verificado' : 'Pendente'}
              </Text>
            </View>
          </View>
          {user.role === 'MENOR' && (
            <>
              <Text style={[styles.detailLabel, styles.detailSpacing]}>Código para o Responsável</Text>
              <View style={styles.codeBox}>
                <Text style={styles.code}>{user.parentLinkCode ?? '— — — — — — — —'}</Text>
              </View>
              {user.parentLinkCodeExpiresAt && (
                <Text style={styles.helperText}>
                  Expira em: {new Date(user.parentLinkCodeExpiresAt).toLocaleDateString()}
                </Text>
              )}
            </>
          )}
        </Surface>

        {isGuardian && (
          <Surface tone="muted">
            <Text style={styles.sectionTitle}>Dashboard parental</Text>
            <Text style={styles.helperText}>
              Consulte o inventário dos dependentes e aprove/reprove eventos e trocas num só lugar.
            </Text>
            <PokeButton
              label="Abrir dashboard"
              onPress={() => navigation.navigate('ParentalDashboard')}
              fullWidth
              style={styles.ctaButton}
            />
          </Surface>
        )}

        {awaitingGuardian && (
          <Surface tone="warning">
            <Text style={styles.sectionTitle}>Aguardando ligação</Text>
            <Text style={styles.warningText}>
              Assim que o responsável concluir a ligação da conta, a app desbloqueia todas as funcionalidades.
            </Text>
          </Surface>
        )}

        {isGuardian && (
          <Surface>
            <Text style={styles.sectionTitle}>Ligar conta do menor</Text>
            <Text style={styles.helperText}>
              Introduza o código partilhado pelo menor para concluir o controlo parental.
            </Text>
            <PokeTextInput
              placeholder="AB12CD34"
              value={linkCode}
              onChangeText={setLinkCode}
              maxLength={8}
              autoCapitalize="characters"
              label="Código do menor"
            />
            <PokeButton
              label="Ligar conta"
              onPress={handleLinkAccount}
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
          </Surface>
        )}

        {isGuardian && (
          <Surface>
            <Text style={styles.sectionTitle}>Aprovações pendentes</Text>
            {renderPendingEvents()}
          </Surface>
        )}

        {isVendor && (
          <Surface>
            <Text style={styles.sectionTitle}>Ferramentas de vendedor</Text>
            <Text style={styles.helperText}>
              Acompanhe o dashboard e registe vendas rápidas diretamente do inventário.
            </Text>
            <PokeButton label="Abrir dashboard" onPress={() => navigation.navigate('Vendor')} fullWidth style={styles.ctaButton} />
          </Surface>
        )}

        <View style={styles.logoutBox}>
          <PokeButton variant="outline" label="Terminar sessão" onPress={handleLogout} style={styles.logoutButton} fullWidth />
        </View>
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
  },
  heroCard: {
    gap: 8,
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.pokeballWhite,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.pokeballWhite,
  },
  heroEmail: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.pokeballWhite,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badgeMuted: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSubtle,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  detailSpacing: {
    marginTop: 16,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  code: {
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '700',
    color: colors.text,
  },
  helperText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: colors.warning,
  },
  ctaButton: {
    marginTop: 12,
  },
  approvalsState: {
    paddingVertical: 12,
  },
  approvalCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  approvalTitle: {
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  approvalDate: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  approvalSub: {
    color: colors.textMuted,
    marginBottom: 8,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approvalSlot: {
    flex: 1,
  },
  errorText: {
    color: colors.danger,
  },
  logoutBox: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoutButton: {
    marginTop: 8,
  },
  textSuccess: {
    color: colors.success,
  },
  textWarning: {
    color: colors.warning,
  },
});

export default ProfileScreen;
