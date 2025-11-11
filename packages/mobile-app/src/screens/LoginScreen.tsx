import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import api from '../api/api';
import type { AuthScreenProps } from '../navigation/types';
import useAuthStore from '../store/authStore';
import { colors } from '../theme/colors';
import PokeButton from '../components/PokeButton';
import PokeTextInput from '../components/PokeTextInput';

const LoginScreen: React.FC<AuthScreenProps<'Login'>> = ({ navigation }) => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos obrigatórios', 'Informe e-mail e password.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });

      setAuth(data);

      if (data.user.role === 'RESPONSAVEL') {
        Alert.alert('Login concluído', 'Aceda ao separador Perfil para ligar a conta do menor.');
      } else if (data.user.role === 'MENOR' && data.user.requiresParentalLink) {
        Alert.alert(
          'Partilhe o código',
          `O código para o responsável é ${data.user.parentLinkCode ?? 'indisponível'}.`,
        );
      } else {
        Alert.alert('Login concluído', `Bem-vindo de volta, ${data.user.nome}!`);
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'Credenciais inválidas'
        : 'Não foi possível efetuar login';
      Alert.alert('Erro no login', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = submitting || !email || !password;

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.safeArea}
      keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.pokeballTop} />
          <View style={styles.pokeballStripe} />
          <View style={styles.pokeballCenter} />
          <Text style={styles.heroLabel}>PokéBinder Digital</Text>
          <Text style={styles.heroTitle}>Colecione, organize e troque com estilo.</Text>
          <Text style={styles.heroSubtitle}>Tudo o que o seu álbum precisa cabe no bolso.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Entrar</Text>
          <PokeTextInput
            label="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ash@pokeleague.com"
            value={email}
            onChangeText={setEmail}
          />
          <PokeTextInput
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          <PokeButton label="Começar a batalha" onPress={handleLogin} loading={submitting} disabled={isDisabled} fullWidth />
          <PokeButton
            variant="outline"
            label="Ainda não tenho conta"
            onPress={() => navigation.navigate('Register')}
            style={styles.secondaryAction}
            fullWidth
          />
        </View>

        <View style={styles.featureGrid}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>📷</Text>
            </View>
            <Text style={styles.featureTitle}>Scan inteligente</Text>
            <Text style={styles.featureCopy}>Fotografe a carta e deixe a IA reconhecer e precificar.</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🛡️</Text>
            </View>
            <Text style={styles.featureTitle}>Controlo parental</Text>
            <Text style={styles.featureCopy}>Responsáveis aprovam eventos e trocas em tempo real.</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🔁</Text>
            </View>
            <Text style={styles.featureTitle}>Negocie com segurança</Text>
            <Text style={styles.featureCopy}>Compare inventários, proponha trocas e finalize com handshake.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  hero: {
    marginTop: 40,
    padding: 24,
    backgroundColor: colors.primary,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  heroLabel: {
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: colors.pokeballWhite,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  pokeballTop: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -40,
    right: -30,
  },
  pokeballStripe: {
    position: 'absolute',
    height: 16,
    width: '160%',
    backgroundColor: colors.pokeballStripe,
    top: '52%',
    left: '-40%',
    opacity: 0.25,
    transform: [{ rotate: '-8deg' }],
  },
  pokeballCenter: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 6,
    borderColor: colors.pokeballWhite,
    backgroundColor: colors.pokeballStripe,
    top: 28,
    right: 32,
    opacity: 0.2,
  },
  formCard: {
    marginTop: -32,
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accentDark,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text,
  },
  secondaryAction: {
    marginTop: 12,
  },
  featureGrid: {
    marginTop: 32,
    gap: 12,
  },
  feature: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.surfaceMuted,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  featureCopy: {
    marginTop: 4,
    color: colors.textMuted,
  },
});

export default LoginScreen;
