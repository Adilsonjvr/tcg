import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LinkParentScreen from '../screens/LinkParentScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <Stack.Navigator initialRouteName="Login">
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: 'Criar conta' }}
    />
    <Stack.Screen
      name="LinkParent"
      component={LinkParentScreen}
      options={{ title: 'Ligar conta do menor' }}
    />
  </Stack.Navigator>
);

export default AuthNavigator;
