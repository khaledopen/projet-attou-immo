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
              playMessageSound();
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

    return (
      <TouchableOpacity 
        style={styles.annonceCard} 
        onPress={() => setSelectedAnnonceId(item.annonce.id)}
      >
        <View style={styles.annonceIconContainer}>
          <Ionicons name="business" size={24} color="#0ea5e9" />
        </View>
        <View style={styles.annonceInfo}>
          <Text style={styles.annonceTitle} numberOfLines={1}>{item.annonce.titre}</Text>
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
    let lastMessage = item.messages?.[0]?.contenu || 'Nouvelle conversation';
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
        style={[styles.convCard, !isAccepted && styles.convCardLocked]} 
        onPress={() => handleSelectLocataire(item)}
      >
        <View style={[styles.avatar, { backgroundColor: isWarn ? '#ef4444' : (isAccepted ? '#10b981' : '#94a3b8') }]}>
          <Text style={styles.avatarText}>{isWarn ? 'A' : interlocuteur.prenom[0]}</Text>
        </View>
        <View style={styles.convInfo}>
          <View style={styles.locataireHeader}>
            <Text style={styles.name}>{isWarn ? 'Administrateur AttouHome' : `${interlocuteur.prenom} ${interlocuteur.nom}`}</Text>
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
          <Text style={styles.lastMessage} numberOfLines={1}>{lastMessage}</Text>
        </View>
        <Ionicons 
          name={isAccepted ? "chatbox-ellipses" : "lock-closed-outline"} 
          size={20} 
          color={isWarn ? "#ef4444" : (isAccepted ? "#0ea5e9" : "#94a3b8")} 
        />
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
  annonceIconContainer: { 
    width: 46, 
    height: 46, 
    borderRadius: 12, 
    backgroundColor: '#e0f2fe', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  annonceInfo: { flex: 1 },
  annonceTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
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
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  convInfo: { flex: 1, marginRight: 8 },
  locataireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4
  },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
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
  lastMessage: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { marginTop: 15, color: '#94a3b8', fontSize: 16, textAlign: 'center', fontWeight: '500' }
});
