import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyInventoryScreen from '../screens/MyInventoryScreen';
import AddCardScreen from '../screens/AddCardScreen';
import type { InventoryStackParamList } from './types';

const Stack = createNativeStackNavigator<InventoryStackParamList>();

const InventoryNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MyInventory"
      component={MyInventoryScreen}
      options={{ title: 'Meu Inventário' }}
    />
    <Stack.Screen
      name="AddCard"
      component={AddCardScreen}
      options={{ title: 'Adicionar carta' }}
    />
  </Stack.Navigator>
);

export default InventoryNavigator;
