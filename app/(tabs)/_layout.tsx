import React, { useState, useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SOCKET_URL } from '../../api/config';
import api from '../../api/axiosInstance';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const insets = useSafeAreaInsets();

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await api.get('/messages/unread-count');
      setUnreadCount(res.data.unreadCount);
    } catch (e) {
      // silently fail
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const setupSocket = async () => {
      const userStr = await AsyncStorage.getItem('userData');
      if (userStr) {
        const user = JSON.parse(userStr);
        socketRef.current = io(SOCKET_URL, {
          transports: ['polling', 'websocket'],
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          }
        });
        socketRef.current.emit('join', user.id);
        socketRef.current.on('nouveau_message', (msg: any) => {
          // Optimistic increment for instant badge update
          if (String(msg?.expediteurId) !== String(user.id)) {
            setUnreadCount((prev) => prev + 1);
          }
          // Then reconcile with the actual server count
          fetchUnreadCount();
        });
        socketRef.current.on('unread_count_update', () => {
          fetchUnreadCount();
        });
      }
    };
    setupSocket();

    // Refresh unread count every 30s
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingTop: 10,
          ...Platform.select({
            ios: {
              paddingBottom: 20,
              height: 80,
            },
            android: {
              paddingBottom: Math.max(insets.bottom, 12),
              height: 60 + Math.max(insets.bottom, 12),
            }
          })
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 11 },
        }}
        listeners={{
          tabPress: () => {
            // Reset le compteur quand on clique sur l'onglet
            setTimeout(fetchUnreadCount, 1000);
          }
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
