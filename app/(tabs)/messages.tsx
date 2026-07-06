import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
  const [selectedAnnonceId, setSelectedAnnonceId] = useState(null);
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
      const res = await api.get('/messages/conversations');
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

          socketRef.current.on('property_updated', () => {
            if (active) {
              fetchConversations();
            }
          });

          socketRef.current.on('property_deleted', () => {
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

  // Helper for time formatting
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

  // Regrouper les conversations par bien (annonce)
  const conversationsByAnnonce = conversations.reduce((acc: any, conv: any) => {
    if (!conv.annonce) return acc;
    const idAnnonce = conv.annonceId || conv.annonce.id;
    if (!acc[idAnnonce]) {
      acc[idAnnonce] = {
        annonce: conv.annonce,
        conversations: []
      };
    }
    acc[idAnnonce].conversations.push(conv);
    return acc;
  }, {});

  const groupedAnnonces = Object.values(conversationsByAnnonce);

  const handleSelectLocataire = (conv: any) => {
    const isWarn = conv.messages?.[0]?.contenu?.startsWith('[ADMIN_WARN]');
    if (conv.statutVisite === 'ACCEPTEE' || isWarn) {
      router.push(`/chat/${conv.id}`);
    } else {
      Alert.alert(
        'Action requise',
        "Vous devez d'abord accepter la demande de visite de ce locataire dans l'onglet 'Visites' avant de pouvoir échanger avec lui par message.",
        [{ text: 'OK' }]
      );
    }
  };

  // Rendu de la liste des biens immobiliers
  const renderAnnonceItem = ({ item }: any) => {
    const totalDemandes = item.conversations.length;
    const acceptedCount = item.conversations.filter((c: any) => c.statutVisite === 'ACCEPTEE').length;
    // Compute total unread messages for all conversations of this property
    const totalUnread = item.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

    return (
      <TouchableOpacity 
        style={[styles.annonceCard, totalUnread > 0 && styles.annonceCardUnread]} 
        onPress={() => setSelectedAnnonceId(item.annonce.id)}
      >
        <View style={styles.annonceIconOuterContainer}>
          <View style={[styles.annonceIconContainer, totalUnread > 0 && styles.annonceIconContainerUnread]}>
            <Ionicons name="business" size={24} color={totalUnread > 0 ? '#fff' : '#0ea5e9'} />
          </View>
          {totalUnread > 0 && (
            <View style={styles.annonceUnreadDot}>
              <Text style={styles.annonceUnreadDotText}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.annonceInfo}>
          <Text style={[styles.annonceTitle, totalUnread > 0 && styles.annonceTitleUnread]} numberOfLines={1}>{item.annonce.titre}</Text>
          <Text style={styles.annonceSubtitle}>
            {totalDemandes} {totalDemandes > 1 ? 'demandes reçues' : 'demande reçue'}
          </Text>
        </View>
        {acceptedCount > 0 && (
          <View style={styles.acceptedBadge}>
            <Text style={styles.acceptedBadgeText}>{acceptedCount} OK</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  // Rendu de la liste des locataires pour un bien sélectionné
  const renderLocataireItem = ({ item }: any) => {
    const interlocuteur = item.locataire;
    const hasUnread = (item.unreadCount || 0) > 0;
    const lastMsg = item.messages?.[0];
    let lastMessage = lastMsg?.contenu || 'Nouvelle conversation';
    const lastTime = lastMsg?.dateEnvoi || item.dateMiseAJour;
    const isWarn = lastMessage.startsWith('[ADMIN_WARN]');

    if (lastMessage.startsWith('SYSTEM_PENDING|')) {
      const parts = lastMessage.split('|');
      lastMessage = `Demande de visite reçue pour : ${parts[1]}`;
    } else if (lastMessage.startsWith('SYSTEM_ACCEPTED|')) {
      const parts = lastMessage.split('|');
      lastMessage = `Vous avez accepté la visite pour : ${parts[1]}`;
    } else if (lastMessage.startsWith('SYSTEM_REFUSED|')) {
      const parts = lastMessage.split('|');
      lastMessage = `Vous avez refusé la visite pour : ${parts[1]}`;
    } else if (isWarn) {
      lastMessage = lastMessage.replace('[ADMIN_WARN] ', '⚠️ ');
    }

    const isAccepted = item.statutVisite === 'ACCEPTEE' || isWarn;

    return (
      <TouchableOpacity 
        style={[styles.convCard, !isAccepted && styles.convCardLocked, hasUnread && styles.convCardUnread]} 
        onPress={() => handleSelectLocataire(item)}
      >
        {/* Avatar with unread indicator */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: isWarn ? '#ef4444' : (isAccepted ? '#10b981' : '#94a3b8') }, hasUnread && styles.avatarUnread]}>
            <Text style={styles.avatarText}>{isWarn ? 'A' : interlocuteur.prenom[0]}</Text>
          </View>
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.convInfo}>
          <View style={styles.locataireHeader}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {isWarn ? 'Administrateur AttouHome' : `${interlocuteur.prenom} ${interlocuteur.nom}`}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
              {formatTime(lastTime)}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge, 
              isWarn ? { backgroundColor: '#fee2e2' } : (isAccepted ? styles.statusBadgeSuccess : (item.statutVisite === 'REFUSEE' ? styles.statusBadgeDanger : styles.statusBadgePending))
            ]}>
              <Text style={[
                styles.statusBadgeText,
                isWarn ? { color: '#ef4444' } : (isAccepted ? styles.statusBadgeTextSuccess : (item.statutVisite === 'REFUSEE' ? styles.statusBadgeTextDanger : styles.statusBadgeTextPending))
              ]}>
                {isWarn ? 'Modération' : (isAccepted ? 'Accepté' : (item.statutVisite === 'REFUSEE' ? 'Refusé' : 'En attente'))}
              </Text>
            </View>
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

        {!hasUnread && (
          <Ionicons 
            name={isAccepted ? "chatbox-ellipses" : "lock-closed-outline"} 
            size={20} 
            color={isWarn ? "#ef4444" : (isAccepted ? "#0ea5e9" : "#94a3b8")} 
          />
        )}
      </TouchableOpacity>
    );
  };

  const selectedAnnonceGroup: any = groupedAnnonces.find((g: any) => g.annonce.id === selectedAnnonceId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {selectedAnnonceId !== null && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setSelectedAnnonceId(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {selectedAnnonceId === null ? 'Messagerie par bien' : 'Locataires intéressés'}
        </Text>
      </View>

      {selectedAnnonceId === null ? (
        // Liste des biens
        groupedAnnonces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#94a3b8" />
            <Text style={styles.emptyText}>Aucune demande ni message pour le moment.</Text>
          </View>
        ) : (
          <FlatList
            data={groupedAnnonces}
            keyExtractor={(item: any) => item.annonce.id}
            renderItem={renderAnnonceItem}
            contentContainerStyle={styles.list}
          />
        )
      ) : (
        // Liste des locataires pour un bien
        <View style={{ flex: 1 }}>
          <View style={styles.selectedAnnonceHeader}>
            <Ionicons name="business" size={20} color="#64748b" style={{ marginRight: 8 }} />
            <Text style={styles.selectedAnnonceTitle} numberOfLines={2}>
              {selectedAnnonceGroup?.annonce.titre}
            </Text>
          </View>

          <FlatList
            data={selectedAnnonceGroup?.conversations || []}
            keyExtractor={(item) => item.id}
            renderItem={renderLocataireItem}
            contentContainerStyle={styles.list}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff'
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  list: { padding: 20 },
  
  // Styles pour les annonces
  annonceCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a', 
    shadowOpacity: 0.04, 
    shadowRadius: 10, 
    elevation: 2 
  },
  annonceCardUnread: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  annonceIconOuterContainer: {
    position: 'relative',
    marginRight: 12,
  },
  annonceIconContainer: { 
    width: 46, 
    height: 46, 
    borderRadius: 12, 
    backgroundColor: '#e0f2fe', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  annonceIconContainerUnread: {
    backgroundColor: '#0ea5e9',
  },
  annonceUnreadDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#22c55e',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  annonceUnreadDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  annonceInfo: { flex: 1 },
  annonceTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  annonceTitleUnread: { color: '#0f172a', fontWeight: '900' },
  annonceSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  acceptedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4
  },
  acceptedBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700'
  },

  // Styles pour les locataires
  selectedAnnonceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10
  },
  selectedAnnonceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    flex: 1
  },
  convCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a', 
    shadowOpacity: 0.03, 
    shadowRadius: 8, 
    elevation: 2 
  },
  convCardLocked: {
    opacity: 0.85,
    backgroundColor: '#f8fafc'
  },
  convCardUnread: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
    borderColor: '#bae6fd',
  },

  // Avatar with unread dot
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarUnread: {
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#fff',
  },

  convInfo: { flex: 1, marginRight: 8 },
  locataireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800', color: '#0f172a' },
  timeText: { fontSize: 11, color: '#94a3b8' },
  timeTextUnread: { color: '#0ea5e9', fontWeight: '700' },

  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeSuccess: {
    backgroundColor: '#dcfce7'
  },
  statusBadgePending: {
    backgroundColor: '#fff7ed'
  },
  statusBadgeDanger: {
    backgroundColor: '#fee2e2'
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusBadgeTextSuccess: {
    color: '#15803d'
  },
  statusBadgeTextPending: {
    color: '#c2410c'
  },
  statusBadgeTextDanger: {
    color: '#ef4444'
  },

  // Bottom row with last message and unread badge
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: { fontSize: 13, color: '#94a3b8', lineHeight: 18, flex: 1, marginRight: 8 },
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
    fontSize: 11,
    fontWeight: '800',
  },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { marginTop: 15, color: '#94a3b8', fontSize: 16, textAlign: 'center', fontWeight: '500' }
});
