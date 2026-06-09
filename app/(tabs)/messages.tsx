import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SOCKET_URL } from '../../api/config';
import api from '../../api/axiosInstance';
import { io } from 'socket.io-client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playMessageSound } from '../../utils/notificationSound';

export default function MessagesScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  const fetchConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const socketRef = useRef(null);

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
            transports: ['polling', 'websocket'],
            extraHeaders: {
              'ngrok-skip-browser-warning': 'true',
              'bypass-tunnel-reminder': 'true',
            }
          });
          socketRef.current.emit('join', user.id);

          socketRef.current.on('nouveau_message', (msg) => {
            if (active) {
              playMessageSound();
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

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>Messagerie</Text>
        <View style={styles.emptyContainer}>
          <View style={styles.unauthIconWrapper}>
            <Ionicons name="chatbubbles-outline" size={48} color="#0ea5e9" />
          </View>
          <Text style={styles.unauthTitle}>Discutez avec les propriétaires</Text>
          <Text style={styles.unauthSubtitle}>
            Connectez-vous ou créez un compte gratuitement en quelques secondes pour chatter en temps réel avec les propriétaires.
          </Text>
          
          <TouchableOpacity style={styles.unauthBtn} onPress={() => router.push({ pathname: '/login', params: { redirectTo: '/(tabs)/messages' } })}>
            <Text style={styles.unauthBtnText}>Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.unauthSecondaryBtn} onPress={() => router.push({ pathname: '/register', params: { redirectTo: '/(tabs)/messages' } })}>
            <Text style={styles.unauthSecondaryBtnText}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    const interlocuteur = item.proprietaire;
    let lastMessage = item.messages?.[0]?.contenu || 'Nouvelle conversation';

    if (lastMessage.startsWith('SYSTEM_PENDING|')) {
      const parts = lastMessage.split('|');
      lastMessage = `Visite en attente de réponse : ${parts[1]}`;
    } else if (lastMessage.startsWith('SYSTEM_ACCEPTED|')) {
      const parts = lastMessage.split('|');
      lastMessage = `Visite acceptée ! : ${parts[1]}`;
    } else if (lastMessage.startsWith('SYSTEM_REFUSED|')) {
      const parts = lastMessage.split('|');
      lastMessage = `Visite refusée : ${parts[1]}`;
    }

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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <Text style={styles.property} numberOfLines={1}>{item.annonce?.titre}</Text>
            {item.statutVisite && (
              <View style={[
                styles.miniBadge,
                item.statutVisite === 'ACCEPTEE' ? styles.badgeSuccess : (item.statutVisite === 'REFUSEE' ? styles.badgeDanger : styles.badgePending)
              ]}>
                <Text style={[
                  styles.miniBadgeText,
                  item.statutVisite === 'ACCEPTEE' ? styles.badgeTextSuccess : (item.statutVisite === 'REFUSEE' ? styles.badgeTextDanger : styles.badgeTextPending)
                ]}>
                  {item.statutVisite === 'ACCEPTEE' ? 'Acceptée' : (item.statutVisite === 'REFUSEE' ? 'Refusée' : 'En attente')}
                </Text>
              </View>
            )}
          </View>
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
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  convInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  property: { fontSize: 12, color: '#0ea5e9', flexShrink: 1 },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgePending: { backgroundColor: '#fff7ed' },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextSuccess: { color: '#15803d' },
  badgeTextDanger: { color: '#ef4444' },
  badgeTextPending: { color: '#c2410c' },
  lastMessage: { fontSize: 14, color: '#64748b' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyText: { marginTop: 15, color: '#64748b', fontSize: 16 },
  unauthIconWrapper: { width: 90, height: 90, backgroundColor: '#f0f9ff', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  unauthTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  unauthSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  unauthBtn: { backgroundColor: '#0ea5e9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 },
  unauthBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  unauthSecondaryBtn: { backgroundColor: '#fff', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
  unauthSecondaryBtnText: { color: '#0ea5e9', fontSize: 16, fontWeight: '700' }
});
