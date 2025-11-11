import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import axios from 'axios';
import api from '../api/api';
import type { AuthScreenProps } from '../navigation/types';
import useAuthStore from '../store/authStore';

const LinkParentScreen: React.FC<AuthScreenProps<'LinkParent'>> = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLink = async () => {
    if (code.length !== 8) {
      Alert.alert('Código inválido', 'O código deve ter 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/parental/link-account', {
        parentLinkCode: code.trim().toUpperCase(),
      });

      updateUser({ requiresParentalLink: false });
      Alert.alert('Conta ligada', 'A conta do menor foi ligada com sucesso.');
      setCode('');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'Não foi possível ligar a conta'
        : 'Erro inesperado ao ligar conta';
      Alert.alert('Erro', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Introduzir código do menor</Text>
      <Text style={styles.subtitle}>
        Peça ao menor para partilhar o código de ligação e introduza-o abaixo para completar o controlo parental.
      </Text>
      <TextInput
        placeholder="Código"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        style={styles.input}
        maxLength={8}
      />
      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleLink} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Ligar Conta</Text>}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LinkParentScreen;
