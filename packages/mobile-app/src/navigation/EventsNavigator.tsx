import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventListScreen from '../screens/EventListScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import AggregatedInventoryScreen from '../screens/AggregatedInventoryScreen';
import TradeProposalScreen from '../screens/TradeProposalScreen';
import type { EventsStackParamList } from './types';

const Stack = createNativeStackNavigator<EventsStackParamList>();

const EventsNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name="EventList" component={EventListScreen} options={{ title: 'Eventos' }} />
    <Stack.Screen
      name="EventDetail"
      component={EventDetailScreen}
      options={({ route }) => ({ title: route.params.event.titulo })}
    />
    <Stack.Screen
      name="AggregatedInventory"
      component={AggregatedInventoryScreen}
      options={({ route }) => ({ title: route.params.eventTitle })}
    />
    <Stack.Screen
      name="TradeProposal"
      component={TradeProposalScreen}
      options={{ title: 'Propor troca' }}
    />
  </Stack.Navigator>
);

export default EventsNavigator;
