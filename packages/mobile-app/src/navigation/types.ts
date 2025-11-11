import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EventSummary } from '../api/events';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  LinkParent: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;

export type AppTabParamList = {
  Inventory: undefined;
  Events: undefined;
  Trading: undefined;
  Profile: undefined;
  Vendor: undefined;
};
export type ProfileStackParamList = {
  ProfileHome: undefined;
  ParentalDashboard: undefined;
};

export type InventoryStackParamList = {
  MyInventory: undefined;
  AddCard: undefined;
};

export type EventsStackParamList = {
  EventList: undefined;
  EventDetail: { event: EventSummary };
  AggregatedInventory: { eventId: string; eventTitle: string };
  TradeProposal: {
    eventId: string;
    receiverId: string;
    receiverName: string;
    cardId?: string;
    cardName?: string;
  };
};

export type VendorStackParamList = {
  VendorDashboard: undefined;
};
