import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import AwaitingParentalLinkScreen from './src/screens/AwaitingParentalLinkScreen';
import useAuthStore from './src/store/authStore';
import { colors } from './src/theme/colors';

const queryClient = new QueryClient();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.secondary,
  },
};

const RootNavigator = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token || !user) {
    return <AuthNavigator />;
  }

  if (user.role === 'MENOR' && user.requiresParentalLink) {
    return <AwaitingParentalLinkScreen />;
  }

  return <AppNavigator />;
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
