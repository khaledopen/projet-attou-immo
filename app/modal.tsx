import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function NotificationsModal() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${BASE_URL}/notifications`, { headers });
      setNotifications(res.data);

      // Automatically mark all as read when opening notifications
      await axios.patch(`${BASE_URL}/notifications/read-all`, {}, { headers });
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = ({ item }) => (
    <View style={[styles.notificationCard, !item.lu && styles.unreadCard]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.titre.includes('visite') ? 'calendar-outline' : 'home-outline'} 
          size={24} 
          color="#0ea5e9" 
        />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.titre}</Text>
          <Text style={styles.timeText}>
            {new Date(item.dateCreation).toLocaleDateString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            } as any)}
          </Text>
        </View>
        <Text style={styles.cardContent}>{item.contenu}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#0ea5e9" />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Vous n'avez pas de notifications pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
  },
  unreadCard: {
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardContent: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },
});
