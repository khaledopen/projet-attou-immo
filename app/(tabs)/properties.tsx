import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../api/config';

const OwnerProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyProperties = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${BASE_URL}/properties/owner/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      console.error('Erreur mes biens:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.photos?.[0]?.url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80' }} 
        style={styles.image} 
      />
      <View style={styles.info}>
        <Text style={styles.title}>{item.titre}</Text>
        <Text style={styles.price}>{item.prix.toLocaleString()} FCFA</Text>
        <View style={styles.statusRow}>
          <View style={[styles.badge, item.statut === 'PUBLIEE' ? styles.badgeActive : styles.badgeDraft]}>
            <Text style={styles.badgeText}>{item.statut}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="create-outline" size={20} color="#1e3a8a" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1e3a8a" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Biens Immobiliers</Text>
      </View>
      <FlatList
        data={properties}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyProperties(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Vous n'avez pas encore publié de bien.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e3a8a' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  image: { width: '100%', height: 180 },
  info: { padding: 15 },
  title: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  price: { fontSize: 14, color: '#1e3a8a', fontWeight: '700', marginTop: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#f0fdf4' },
  badgeDraft: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#1e293b' },
  editBtn: { padding: 5 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#94a3b8', fontSize: 14 }
});

export default OwnerProperties;
