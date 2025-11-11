import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import ParentalDashboardScreen from '../screens/ParentalDashboardScreen';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ProfileHome"
      component={ProfileScreen}
      options={{ title: 'Perfil' }}
    />
    <Stack.Screen
      name="ParentalDashboard"
      component={ParentalDashboardScreen}
      options={{ title: 'Dashboard Parental' }}
    />
  </Stack.Navigator>
);

export default ProfileNavigator;
