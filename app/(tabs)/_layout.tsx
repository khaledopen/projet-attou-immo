import { Tabs } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
        socketRef.current.on('nouveau_message', () => {
          fetchUnreadCount();
        });
        socketRef.current.on('unread_count_update', () => {
          fetchUnreadCount();
        });
      }
    };
    setupSocket();

    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          paddingHorizontal: 8,
          justifyContent: 'center',
          ...Platform.select({
            ios: {
              height: 80,
              paddingBottom: 20,
              paddingTop: 12,
            },
            android: {
              height: 60 + Math.max(insets.bottom, 12),
              paddingBottom: Math.max(insets.bottom, 12),
              paddingTop: 8,
            },
            default: {
              height: 70,
              paddingBottom: 12,
              paddingTop: 12,
            }
          })
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Mes Biens',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visites',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={28} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 11 },
        }}
        listeners={{
          tabPress: () => {
            setTimeout(fetchUnreadCount, 1000);
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
