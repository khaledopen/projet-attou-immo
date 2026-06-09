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
  const [statutVisite, setStatutVisite] = useState<string | null>(null);
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

        // Fetch conversations to get visit status
        const convsRes = await api.get('/messages/conversations');
        const currentConv = convsRes.data.find((c: any) => c.id === id);
        if (currentConv) {
          setStatutVisite(currentConv.statutVisite);
        }

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
            // Mettre à jour le statut de visite si le message système d'acceptation arrive
            if (msg.contenu.startsWith('SYSTEM_ACCEPTED')) {
              setStatutVisite('ACCEPTEE');
            } else if (msg.contenu.startsWith('SYSTEM_REFUSED')) {
              setStatutVisite('REFUSEE');
            }
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

  const renderItem = ({ item }) => {
    const isMe = item.expediteurId === userId;
    const time = new Date(item.dateEnvoi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let displayContent = item.contenu;
    let isSystem = false;

    if (item.contenu.startsWith('SYSTEM_PENDING|')) {
      isSystem = true;
      const parts = item.contenu.split('|');
      const titre = parts[1] || '';
      displayContent = `Demande de visite envoyée pour le bien "${titre}". En attente de confirmation du propriétaire.`;
    } else if (item.contenu.startsWith('SYSTEM_ACCEPTED|')) {
      isSystem = true;
      const parts = item.contenu.split('|');
      const titre = parts[1] || '';
      const telephone = parts[3] || 'non renseigné';
      displayContent = `Félicitations ! Votre demande de visite pour le bien "${titre}" a été ACCEPTÉE. Vous pouvez désormais échanger par message ou appeler au : ${telephone}.`;
    } else if (item.contenu.startsWith('SYSTEM_REFUSED|')) {
      isSystem = true;
      const parts = item.contenu.split('|');
      const titre = parts[1] || '';
      displayContent = `Votre demande de visite pour le bien "${titre}" a été REFUSÉE par le propriétaire.`;
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

  const isChatLocked = statutVisite !== 'ACCEPTEE';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Discussion</Text>
          {statutVisite && (
            <Text style={[
              styles.headerSubtitle,
              statutVisite === 'ACCEPTEE' ? { color: '#10b981' } : (statutVisite === 'REFUSEE' ? { color: '#ef4444' } : { color: '#f59e0b' })
            ]}>
              {statutVisite === 'ACCEPTEE' ? 'Visite Acceptée' : (statutVisite === 'REFUSEE' ? 'Visite Refusée' : 'Visite en attente')}
            </Text>
          )}
        </View>
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

        <View style={[styles.inputContainer, isChatLocked && styles.disabledInputContainer]}>
          <TextInput
            style={[styles.input, isChatLocked && styles.disabledInput]}
            placeholder={statutVisite === 'REFUSEE' ? "Demande de visite refusée par le propriétaire." : (statutVisite === 'EN_ATTENTE' ? "En attente d'acceptation de la visite..." : "Écrivez un message...")}
            placeholderTextColor={isChatLocked ? '#94a3b8' : '#64748b'}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            editable={!isChatLocked}
          />
          <TouchableOpacity 
            style={[styles.sendButton, isChatLocked && styles.disabledSendButton]} 
            onPress={handleSend}
            disabled={isChatLocked}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  headerSubtitle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  list: { padding: 15, paddingBottom: 30 },
  messageBubble: { maxWidth: '80%', padding: 15, borderRadius: 20, marginBottom: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#0ea5e9', borderBottomRightRadius: 5 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 15 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#0f172a' },
  timeText: { fontSize: 12, color: '#64748b', alignSelf: 'flex-end', marginTop: 4 },
  myTimeText: { color: '#e0f7ff' },
  otherTimeText: { color: '#64748b' },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: '#0f172a' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'flex-end', borderTopWidth: 1, borderColor: '#e2e8f0' },
  sendButton: { backgroundColor: '#0ea5e9', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
  disabledInputContainer: { backgroundColor: '#f8fafc', borderTopWidth: 1, borderColor: '#e2e8f0' },
  disabledInput: { color: '#94a3b8', backgroundColor: '#f1f5f9' },
  disabledSendButton: { backgroundColor: '#cbd5e1' },
  systemContainer: { alignItems: 'center', marginVertical: 15, width: '100%' },
  systemBubble: { backgroundColor: '#f1f5f9', borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '90%', alignItems: 'center' },
  systemMessageText: { color: '#475569', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 }
});
