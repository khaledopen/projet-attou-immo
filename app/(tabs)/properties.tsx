import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../api/config';
import { useRouter } from 'expo-router';

const OwnerProperties = () => {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyProperties = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      let proprietaireId = undefined;
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        proprietaireId = userData.id;
      }

      const response = await axios.get(`${BASE_URL}/properties`, {
        params: proprietaireId ? { proprietaireId } : {},
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

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer l\'annonce',
      'Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(`${BASE_URL}/properties/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Succès', 'L\'annonce a été supprimée avec succès.');
              fetchMyProperties();
            } catch (error) {
              console.error('Erreur suppression annonce:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cette annonce.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.photos?.[0]?.url ? (
        <Image source={{ uri: item.photos[0].url }} style={styles.image} />
      ) : (
        <View style={styles.noImagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#94a3b8" />
          <Text style={styles.noImageText}>Aucune photo disponible</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title}>{item.titre}</Text>
        <Text style={styles.price}>{item.prix.toLocaleString()} FCFA</Text>
        <View style={styles.statusRow}>
          <View style={[styles.badge, item.statut === 'PUBLIEE' ? styles.badgeActive : styles.badgeDraft]}>
            <Text style={styles.badgeText}>{item.statut}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => router.push({ pathname: '/edit-property', params: { id: item.id } })}
            >
              <Ionicons name="create-outline" size={20} color="#0ea5e9" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0ea5e9" />;

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
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0ea5e9' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  image: { width: '100%', height: 180 },
  info: { padding: 15 },
  title: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  price: { fontSize: 14, color: '#0ea5e9', fontWeight: '700', marginTop: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#f0fdf4' },
  badgeDraft: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#1e293b' },
  actionButtons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editBtn: { padding: 5 },
  deleteBtn: { padding: 5 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#94a3b8', fontSize: 14 },
  noImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noImageText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
});

export default OwnerProperties;
