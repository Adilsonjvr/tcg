import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EventsNavigator from './EventsNavigator';
import InventoryNavigator from './InventoryNavigator';
import ProfileNavigator from './ProfileNavigator';
import TradingScreen from '../screens/TradingScreen';
import VendorNavigator from './VendorNavigator';
import type { AppTabParamList } from './types';
import useAuthStore from '../store/authStore';

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isVendor = user?.role === 'VENDEDOR' || user?.role === 'ADMIN';

  return (
    <Tab.Navigator
      initialRouteName="Inventory"
      screenOptions={{
        headerTitleAlign: 'center',
      }}
    >
      <Tab.Screen
        name="Inventory"
        component={InventoryNavigator}
        options={{ headerShown: false, title: 'Inventário', tabBarLabel: 'Inventário' }}
      />
      <Tab.Screen name="Events" component={EventsNavigator} options={{ headerShown: false, title: 'Eventos', tabBarLabel: 'Eventos' }} />
      <Tab.Screen name="Trading" component={TradingScreen} options={{ title: 'Trocas', tabBarLabel: 'Trocas' }} />
      {isVendor && (
        <Tab.Screen name="Vendor" component={VendorNavigator} options={{ headerShown: false, title: 'Vendor', tabBarLabel: 'Vendor' }} />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ headerShown: false, title: 'Perfil', tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
