import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Alert, View } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../api/config';
import axios from 'axios';
import { playNotificationSound } from '../utils/notificationSound';

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
  const router = useRouter();
  const lastActive = useRef(Date.now());

  const updateActivity = () => {
    lastActive.current = Date.now();
  };

  useEffect(() => {
    let socket: any;

    const setupSocket = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        socket = io(SOCKET_URL, {
          transports: ['polling', 'websocket'],
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          }
        });

        socket.on('connect', () => {
          console.log('Owner connected to socket');
          socket.emit('join', user.id);
        });

        socket.on('notification', (notif: any) => {
          playNotificationSound();
          Alert.alert(notif.title, notif.message);
        });
      }
    };

    setupSocket();

    // Vérifier l'inactivité toutes les 5 secondes
    const inactivityInterval = setInterval(async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const timeSinceActive = Date.now() - lastActive.current;
        if (timeSinceActive > 3600000) { // 1 heure d'inactivité
          console.log('[Inactivity] Déconnexion automatique du propriétaire après 1 heure.');
          await AsyncStorage.multiRemove(['userToken', 'userData', 'refreshToken']);
          Alert.alert('Inactivité', 'Vous avez été déconnecté après 1 heure d\'inactivité.');
          router.replace('/login');
        }
      } else {
        lastActive.current = Date.now();
      }
    }, 5000);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(inactivityInterval);
    };
  }, [router]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <View 
        style={{ flex: 1 }} 
        onStartShouldSetResponderCapture={() => {
          updateActivity();
          return false;
        }}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-property" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-property" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
