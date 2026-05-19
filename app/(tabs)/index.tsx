import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import PropertyCard from '../../components/PropertyCard';
import { useRouter } from 'expo-router';
import { useSocket } from '../../hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ExplorerScreen = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const socket = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unreads = response.data.filter((n: any) => !n.lu).length;
      setUnreadCount(unreads);
    } catch (error) {
      console.error('Erreur count notifications unread:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/properties`);
      setProperties(response.data);
    } catch (error) {
      console.error('Erreur Explorer:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchUnreadNotifications();
  }, []);

  // Poll or refresh unreads when screen focus changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleRealtimeUpdate = () => {
        console.log('Realtime update received via socket, refreshing listings...');
        fetchProperties();
      };
      
      const handleNotificationUpdate = () => {
        console.log('New notification socket event, refreshing unread count...');
        fetchUnreadNotifications();
      };
      
      socket.on('property_created', handleRealtimeUpdate);
      socket.on('property_updated', handleRealtimeUpdate);
      socket.on('notification_created', handleNotificationUpdate);
      
      return () => {
        socket.off('property_created', handleRealtimeUpdate);
        socket.off('property_updated', handleRealtimeUpdate);
        socket.off('notification_created', handleNotificationUpdate);
      };
    }
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProperties();
    fetchUnreadNotifications();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Trouvez votre</Text>
          <Text style={styles.brandText}>AttouHome</Text>
        </View>
        <TouchableOpacity style={styles.notificationBadge} onPress={() => router.push('/modal')}>
          <Ionicons name="notifications-outline" size={24} color="#1e293b" />
          {unreadCount > 0 && <View style={styles.dot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" />
        <Text style={styles.searchText}>Rechercher une ville, un quartier...</Text>
      </View>

      <Text style={styles.sectionTitle}>Annonces récentes</Text>
      
      {properties.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Aucune annonce disponible.</Text>
        </View>
      ) : (
        properties.map((item) => (
          <PropertyCard 
            key={item.id} 
            property={{
              id: item.id,
              title: item.titre,
              price: item.prix,
              address: `${item.bien?.adresse?.ville}, ${item.bien?.adresse?.rue}`,
              type: item.typeBien,
              image: item.photos?.[0]?.url || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80'
            }}
            onPress={() => router.push(`/property/${item.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  welcomeText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  brandText: { fontSize: 28, color: '#0f172a', fontWeight: '800' },
  notificationBadge: { padding: 10, backgroundColor: '#fff', borderRadius: 15, position: 'relative' },
  dot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 30 },
  searchText: { marginLeft: 10, color: '#94a3b8', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 10, color: '#94a3b8' }
});

export default ExplorerScreen;
