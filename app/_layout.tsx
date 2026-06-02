import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Alert } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../api/config';
import axios from 'axios';

axios.defaults.timeout = 30000;
axios.defaults.headers.common['bypass-tunnel-reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Request interceptor for injecting token automatically
axios.interceptors.request.use(
  async (config) => {
    if (!config.headers.Authorization) {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    config.headers['bypass-tunnel-reminder'] = 'true';
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic retry on transient errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isTransientError = 
      !response || 
      [502, 503, 504].includes(response.status) || 
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout');

    if (config && isTransientError) {
      config._retryCount = config._retryCount || 0;
      const maxRetries = 3;
      const delayMs = 1500;

      if (config._retryCount < maxRetries) {
        config._retryCount += 1;
        console.log(`[Axios Global Retry] Tentative ${config._retryCount}/${maxRetries} pour ${config.url} suite à l'erreur: ${error.message}`);
        
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return axios(config);
      }
    }

    return Promise.reject(error);
  }
);

export default function RootLayout() {
  useEffect(() => {
    let socket;

    const setupSocket = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        socket = io(SOCKET_URL);

        socket.on('connect', () => {
          console.log('Connected to socket server');
          socket.emit('join', user.id);
        });

        socket.on('notification', (notif) => {
          Alert.alert(notif.title, notif.message);
        });
      }
    };

    setupSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="property/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </ThemeProvider>
  );
}
