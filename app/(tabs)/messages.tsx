import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');
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
              // Play sound only for messages from others
              if (String(msg.expediteurId) !== String(user.id)) {
                playMessageSound();
              }
              fetchConversations();
            }
          });

          socketRef.current.on('unread_count_update', () => {
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

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const renderItem = ({ item }) => {
    const interlocuteur = item.proprietaire;
    const hasUnread = item.unreadCount > 0;
    const lastMsg = item.messages?.[0];
    let lastMessage = lastMsg?.contenu || 'Nouvelle conversation';
    const lastTime = lastMsg?.dateEnvoi || item.dateMiseAJour;

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
        style={[styles.convCard, hasUnread && styles.convCardUnread]} 
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        {/* Avatar with online-style indicator */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
            <Text style={styles.avatarText}>{interlocuteur.prenom[0]}</Text>
          </View>
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.convInfo}>
          <View style={styles.topRow}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {interlocuteur.prenom} {interlocuteur.nom}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
              {formatTime(lastTime)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
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

          <View style={styles.bottomRow}>
            <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {lastMessage}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredConversations = conversations.filter((item) => {
    const interlocuteur = item.proprietaire;
    const fullName = `${interlocuteur?.prenom || ''} ${interlocuteur?.nom || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const annonceTitre = item.annonce?.titre?.toLowerCase() || '';
    return fullName.includes(query) || annonceTitre.includes(query);
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Messagerie</Text>
      
      {conversations.length > 0 && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un propriétaire ou un bien..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={50} color="#94a3b8" />
          <Text style={styles.emptyText}>Aucune conversation en cours.</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={50} color="#94a3b8" />
          <Text style={styles.emptyText}>Aucun résultat pour "{searchQuery}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 20, paddingBottom: 10, color: '#0f172a' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    padding: 0,
  },
  list: { paddingHorizontal: 20 },

  // Conversation card
  convCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 12, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 2,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  convCardUnread: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },

  // Avatar with unread dot
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#0ea5e9', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  avatarUnread: {
    backgroundColor: '#0284c7',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#fff',
  },

  // Conversation info
  convInfo: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800', color: '#0f172a' },
  timeText: { fontSize: 12, color: '#94a3b8' },
  timeTextUnread: { color: '#0ea5e9', fontWeight: '700' },

  property: { fontSize: 12, color: '#0ea5e9', flexShrink: 1 },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgePending: { backgroundColor: '#fff7ed' },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextSuccess: { color: '#15803d' },
  badgeTextDanger: { color: '#ef4444' },
  badgeTextPending: { color: '#c2410c' },

  // Bottom row with last message and unread badge
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: { fontSize: 14, color: '#94a3b8', flex: 1, marginRight: 8 },
  lastMessageUnread: { color: '#334155', fontWeight: '600' },
  unreadBadge: {
    backgroundColor: '#22c55e',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Empty & unauth states
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
