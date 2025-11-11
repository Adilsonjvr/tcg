import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VendorDashboardScreen from '../screens/VendorDashboardScreen';
import type { VendorStackParamList } from './types';

const Stack = createNativeStackNavigator<VendorStackParamList>();

const VendorNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="VendorDashboard"
      component={VendorDashboardScreen}
      options={{ title: 'Meu Dashboard' }}
    />
  </Stack.Navigator>
);

export default VendorNavigator;
