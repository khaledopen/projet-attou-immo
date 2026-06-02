import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, SOCKET_URL } from '../../api/config';
import { io } from 'socket.io-client';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        const res = await axios.get(`${BASE_URL}/messages/${id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);

        // Setup Socket
        socketRef.current = io(SOCKET_URL, {
          transports: ['websocket']
        });
        socketRef.current.emit('join', user.id);

        socketRef.current.on('nouveau_message', (msg) => {
          if (msg.conversationId === id) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${BASE_URL}/messages/${id}/messages`, {
        contenu: newMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
          {item.contenu}
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
  sendButton: { backgroundColor: '#0ea5e9', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 }
});
