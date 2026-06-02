import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL, SOCKET_URL } from '../../api/config';
import { io } from 'socket.io-client';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MessagesScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const socketRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);
      const res = await axios.get(`${BASE_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh conversations whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  // Setup live websocket listener for new messages
  useEffect(() => {
    let active = true;

    const setupSocket = async () => {
      if (!isLoggedIn) return;
      try {
        const userStr = await AsyncStorage.getItem('userData');
        if (userStr && active) {
          const user = JSON.parse(userStr);
          socketRef.current = io(SOCKET_URL, {
            transports: ['websocket']
          });
          socketRef.current.emit('join', user.id);

          socketRef.current.on('nouveau_message', (msg) => {
            if (active) {
              fetchConversations();
            }
          });
        }
      } catch (err) {
        console.error('Socket setup error in messages tab:', err);
      }
    };

    setupSocket();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLoggedIn]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9" /></View>;
  }

  const renderItem = ({ item }) => {
    const interlocuteur = item.locataire;
    const lastMessage = item.messages?.[0]?.contenu || 'Nouvelle conversation';

    return (
      <TouchableOpacity 
        style={styles.convCard} 
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{interlocuteur.prenom[0]}</Text>
        </View>
        <View style={styles.convInfo}>
          <Text style={styles.name}>{interlocuteur.prenom} {interlocuteur.nom}</Text>
          <Text style={styles.property}>{item.annonce?.titre}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{lastMessage}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Messagerie</Text>
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={50} color="#94a3b8" />
          <Text style={styles.emptyText}>Aucune conversation en cours.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 20, color: '#0f172a' },
  list: { paddingHorizontal: 20 },
  convCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  convInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  property: { fontSize: 12, color: '#0ea5e9', marginBottom: 5 },
  lastMessage: { fontSize: 14, color: '#64748b' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, color: '#64748b', fontSize: 16 }
});
