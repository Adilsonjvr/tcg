import axios from 'axios';
import { Platform } from 'react-native';
import useAuthStore from '../store/authStore';

// Use localhost when running on web, otherwise use the network IP
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // On web platform, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // On mobile (iOS/Android), use network IP
  return 'http://192.168.1.4:3000';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);

export default api;
