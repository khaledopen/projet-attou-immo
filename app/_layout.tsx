import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Alert } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../api/config';
import axios from 'axios';

axios.defaults.headers.common['bypass-tunnel-reminder'] = 'true';

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
