import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import api from '../api/api';
import type { AuthScreenProps } from '../navigation/types';
import useAuthStore, { UserRole } from '../store/authStore';
import { colors } from '../theme/colors';
import PokeTextInput from '../components/PokeTextInput';
import PokeButton from '../components/PokeButton';

const allowedRoles: Array<Extract<UserRole, 'ADULTO' | 'RESPONSAVEL'>> = ['ADULTO', 'RESPONSAVEL'];

const RegisterScreen: React.FC<AuthScreenProps<'Register'>> = ({ navigation }) => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'ADULTO' | 'RESPONSAVEL'>>('ADULTO');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!nome || !email || !password || !nascimento) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        nome,
        email,
        password,
        nascimento,
      };

      if (role === 'RESPONSAVEL') {
        payload.role = role;
      }

      const { data } = await api.post('/auth/register', payload);
      setAuth(data);

      if (data.user.role === 'MENOR' && data.user.parentLinkCode) {
        Alert.alert(
          'Conta criada',
          `Partilhe este código com o responsável: ${data.user.parentLinkCode}`,
        );
      } else if (data.user.role === 'RESPONSAVEL') {
        Alert.alert('Conta criada', 'Vá ao separador Perfil para fazer KYC e ligar a conta do menor.');
      } else {
        Alert.alert('Conta criada', `Bem-vindo, ${data.user.nome}!`);
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'Não foi possível criar a conta'
        : 'Erro inesperado ao criar conta';
      Alert.alert('Erro no registo', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.safeArea}
      keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>Passo 1</Text>
          <Text style={styles.headerTitle}>Crie a sua Poké-Identidade</Text>
          <Text style={styles.headerCopy}>
            Utilize a data de nascimento real para desbloquear automaticamente o tipo de conta correto (adulto, menor,
            responsável).
          </Text>
        </View>

        <View style={styles.card}>
          <PokeTextInput label="Nome completo" value={nome} onChangeText={setNome} placeholder="Ash Ketchum" />
          <PokeTextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ash@pokeleague.com"
          />
          <PokeTextInput
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            placeholder="••••••••"
            helperText="Use pelo menos 8 caracteres."
          />
          <PokeTextInput
            label="Nascimento"
            value={nascimento}
            onChangeText={setNascimento}
            autoCapitalize="none"
            placeholder="YYYY-MM-DD"
            helperText="Usamos esta data para determinar se a conta é adulta ou responsável."
          />

          <Text style={styles.roleLabel}>Quero criar uma conta como</Text>
          <View style={styles.roleSwitcher}>
            {allowedRoles.map((item) => {
              const isActive = role === item;
              return (
                <PokeButton
                  key={item}
                  label={item === 'ADULTO' ? 'Adulto' : 'Responsável'}
                  variant={isActive ? 'secondary' : 'ghost'}
                  onPress={() => setRole(item)}
                  style={styles.roleButton}
                  fullWidth
                />
              );
            })}
          </View>

          <PokeButton label="Criar conta" onPress={handleRegister} loading={submitting} fullWidth />
          <PokeButton
            variant="ghost"
            label="Já tenho conta"
            onPress={() => navigation.navigate('Login')}
            style={styles.returnLogin}
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 32,
    marginBottom: 16,
  },
  headerEyebrow: {
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  headerCopy: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accentDark,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 4,
  },
  roleLabel: {
    marginTop: 12,
    marginBottom: 8,
    color: colors.text,
    fontWeight: '600',
  },
  roleSwitcher: {
    gap: 8,
    marginBottom: 16,
  },
  roleButton: {
    borderRadius: 16,
  },
  returnLogin: {
    marginTop: 8,
  },
});

export default RegisterScreen;
