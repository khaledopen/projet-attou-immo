import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../../api/config';
import api from '../../api/axiosInstance';
import { io } from 'socket.io-client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playMessageSound } from '../../utils/notificationSound';

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // conversationId
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const flatListRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    setupChat();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const setupChat = async () => {
    try {
      const userStr = await AsyncStorage.getItem('userData');
      const token = await AsyncStorage.getItem('userToken');
      if (userStr && token) {
        const user = JSON.parse(userStr);
        setUserId(user.id);

        // Fetch past messages
        const res = await api.get(`/messages/${id}/messages`);
        setMessages(res.data);

        // Setup Socket
        socketRef.current = io(SOCKET_URL, {
          transports: ['polling', 'websocket'],
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          }
        });
        socketRef.current.emit('join', user.id);

        socketRef.current.on('nouveau_message', (msg) => {
          console.log('[SocketClient] 📥 Reçu nouveau_message :', msg);
          if (String(msg.conversationId) === String(id)) {
            // Jouer le son uniquement pour les messages reçus de l'autre personne
            if (msg.expediteurId !== user.id) {
              playMessageSound();
              api.post(`/messages/${id}/read`).catch((err) => {
                console.error('Error marking message as read via socket listener:', err);
              });
            }
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          } else {
            console.warn(`[SocketClient] ⚠️ Message ignoré (ID Conversation mismatch). Reçu: ${msg.conversationId}, Attendu: ${id}`);
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await api.post(`/messages/${id}/messages`, {
        contenu: newMessage
      });
      
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error(e);
    }
  };

  const isModerationWarn = messages.some((msg: any) => msg.contenu.startsWith('[ADMIN_WARN]'));

  const renderItem = ({ item }) => {
    const isMe = item.expediteurId === userId;
    const time = new Date(item.dateEnvoi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let displayContent = item.contenu;
    let isSystem = false;

    if (item.contenu.startsWith('SYSTEM_PENDING|')) {
      isSystem = true;
      const parts = item.contenu.split('|');
      const titre = parts[1] || '';
      const tenantName = parts[2] || '';
      displayContent = `Demande de visite pour le bien "${titre}" envoyée par le locataire ${tenantName}. Vous devez l'accepter ou la refuser dans l'onglet Visites.`;
    } else if (item.contenu.startsWith('SYSTEM_ACCEPTED|')) {
      isSystem = true;
      const parts = item.contenu.split('|');
      const titre = parts[1] || '';
      const tenantName = parts[2] || '';
      displayContent = `Vous avez ACCEPTÉ la demande de visite de ${tenantName} pour le bien "${titre}". Vous pouvez désormais échanger.`;
    } else if (item.contenu.startsWith('SYSTEM_REFUSED|')) {
      isSystem = true;
      const parts = item.contenu.split('|');
      const titre = parts[1] || '';
      const tenantName = parts[2] || '';
      displayContent = `Vous avez REFUSÉ la demande de visite de ${tenantName} pour le bien "${titre}".`;
    }

    if (item.contenu.startsWith('[ADMIN_WARN]')) {
      return (
        <View style={styles.moderationContainer}>
          <View style={styles.moderationHeader}>
            <Ionicons name="shield-alert-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.moderationTitle}>AVERTISSEMENT ADMINISTRATIF</Text>
          </View>
          <Text style={styles.moderationText}>
            {item.contenu.replace('[ADMIN_WARN] ', '')}
          </Text>
          <Text style={styles.moderationTime}>{time}</Text>
        </View>
      );
    }

    if (isSystem) {
      return (
        <View style={styles.systemContainer}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemMessageText}>{displayContent}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
          {displayContent}
        </Text>
        <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>{time}</Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isModerationWarn ? (
          <View style={styles.warnFooter}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" style={{ marginRight: 10 }} />
            <Text style={styles.warnFooterText}>
              Il s'agit d'une notification de modération administrative. Aucune réponse n'est autorisée. Veuillez modifier votre annonce pour corriger les problèmes signalés.
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Écrivez un message..."
              placeholderTextColor="#64748b"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backButton: { padding: 5 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  list: { padding: 15, paddingBottom: 30 },
  messageBubble: { maxWidth: '80%', padding: 15, borderRadius: 20, marginBottom: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#0ea5e9', borderBottomRightRadius: 5 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 15 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#0f172a' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'flex-end', borderTopWidth: 1, borderColor: '#e2e8f0' },
  timeText: { fontSize: 12, color: '#64748b', alignSelf: 'flex-end', marginTop: 4 },
  myTimeText: { color: '#e0f7ff' },
  otherTimeText: { color: '#64748b' },
  // Ajout du contraste du texte de l'input (déjà blanc sur fond gris clair)
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: '#0f172a' },
  sendButton: { backgroundColor: '#0ea5e9', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
  systemContainer: { alignItems: 'center', marginVertical: 15, width: '100%' },
  systemBubble: { backgroundColor: '#f1f5f9', borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '90%', alignItems: 'center' },
  systemMessageText: { color: '#475569', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
  warnFooter: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderColor: '#e2e8f0', shadowColor: '#ef4444', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  warnFooterText: { flex: 1, color: '#ef4444', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  moderationContainer: { alignSelf: 'stretch', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fee2e2', borderRadius: 16, padding: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  moderationHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#fee2e2', paddingBottom: 8, marginBottom: 10 },
  moderationTitle: { color: '#ef4444', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
  moderationText: { color: '#374151', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  moderationTime: { color: '#9ca3af', fontSize: 11, alignSelf: 'flex-end', marginTop: 10 }
});
