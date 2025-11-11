import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import useAuthStore from '../store/authStore';

const AwaitingParentalLinkScreen: React.FC = () => {
  const { user, clearAuth } = useAuthStore((state) => state);

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Aguardando ligação do responsável</Text>
        <Text style={styles.description}>
          Partilhe o código abaixo com o seu responsável para desbloquear o PokéBinder Digital.
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.code}>{user.parentLinkCode ?? '— — — — — — — —'}</Text>
        </View>
        {user.parentLinkCodeExpiresAt && (
          <Text style={styles.expires}>Expira em {new Date(user.parentLinkCodeExpiresAt).toLocaleDateString()}.</Text>
        )}
        <Text style={styles.tip}>
          Assim que o responsável ligar a conta, volte a entrar para aceder ao inventário e eventos.
        </Text>

        <Pressable style={styles.logoutButton} onPress={clearAuth}>
          <Text style={styles.logoutLabel}>Terminar sessão</Text>
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
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  code: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 4,
  },
  expires: {
    color: '#6b7280',
    marginBottom: 16,
  },
  tip: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  logoutButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutLabel: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AwaitingParentalLinkScreen;
