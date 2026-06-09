import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../api/config';
import { useRouter } from 'expo-router';
import { useSocket } from '../../hooks/useSocket';

const OwnerProperties = () => {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socket = useSocket();

  const fetchMyProperties = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const userDataStr = await AsyncStorage.getItem('userData');
      
      let proprietaireId = undefined;
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        proprietaireId = userData.id;
      }

      const response = await api.get('/properties', {
        params: proprietaireId ? { proprietaireId } : {}
      });
      setProperties(response.data);
    } catch (error: any) {
      console.log('Erreur mes biens:', error.message || error);
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
              await api.delete(`/properties/${id}`);
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

  const handleToggleRentStatus = async (id: string, currentStatus: string) => {
    const isRented = currentStatus === 'ARCHIVEE';
    const newStatus = isRented ? 'PUBLIEE' : 'ARCHIVEE';
    
    Alert.alert(
      isRented ? 'Remettre en location' : 'Marquer comme loué',
      isRented 
        ? 'Voulez-vous remettre ce bien en location ? Il sera à nouveau visible par les locataires.' 
        : 'Voulez-vous marquer ce bien comme loué ? Il ne sera plus affiché dans les résultats de recherche.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isRented ? 'Relouer' : 'Confirmer',
          onPress: async () => {
            try {
              setLoading(true);
              await api.put(`/properties/${id}`, { statut: newStatus });
              Alert.alert('Succès', isRented ? 'Le bien est à nouveau en location.' : 'Le bien a été marqué comme loué.');
              fetchMyProperties();
            } catch (error) {
              console.error('Erreur changement statut:', error);
              Alert.alert('Erreur', 'Impossible de modifier le statut de ce bien.');
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

  useEffect(() => {
    if (socket) {
      const handleRealtimeUpdate = () => {
        fetchMyProperties();
      };
      
      socket.on('property_created', handleRealtimeUpdate);
      socket.on('property_updated', handleRealtimeUpdate);
      socket.on('property_deleted', handleRealtimeUpdate);
      
      return () => {
        socket.off('property_created', handleRealtimeUpdate);
        socket.off('property_updated', handleRealtimeUpdate);
        socket.off('property_deleted', handleRealtimeUpdate);
      };
    }
  }, [socket]);

  const renderItem = ({ item }) => {
    let statusText = item.statut;
    let badgeStyle = styles.badgeDraft;
    let badgeTextStyle = styles.badgeTextDraft;

    if (item.statut === 'PUBLIEE') {
      statusText = 'ACTIF';
      badgeStyle = styles.badgeActive;
      badgeTextStyle = styles.badgeTextActive;
    } else if (item.statut === 'ARCHIVEE') {
      statusText = 'LOUÉ';
      badgeStyle = styles.badgeRented;
      badgeTextStyle = styles.badgeTextRented;
    } else if (item.statut === 'EN_ATTENTE') {
      statusText = 'EN ATTENTE';
      badgeStyle = styles.badgePending;
      badgeTextStyle = styles.badgeTextPending;
    }

    return (
      <View style={styles.card}>
        {item.photos?.[0]?.url ? (
          <Image source={{ uri: item.photos[0].url, headers: { 'bypass-tunnel-reminder': 'true' } }} style={styles.image} />
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
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>{statusText}</Text>
            </View>
            <View style={styles.actionButtons}>
              {item.statut !== 'EN_ATTENTE' && item.statut !== 'REJETEE' && (
                <TouchableOpacity 
                  style={styles.statusBtn} 
                  onPress={() => handleToggleRentStatus(item.id, item.statut)}
                >
                  <Ionicons 
                    name={item.statut === 'ARCHIVEE' ? "refresh-circle-outline" : "key-outline"} 
                    size={22} 
                    color={item.statut === 'ARCHIVEE' ? "#10b981" : "#f59e0b"} 
                  />
                </TouchableOpacity>
              )}
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
  };

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
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 },
  badgeTextActive: { color: '#15803d' },
  badgeDraft: { backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1 },
  badgeTextDraft: { color: '#c2410c' },
  badgeRented: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderWidth: 1 },
  badgeTextRented: { color: '#475569' },
  badgePending: { backgroundColor: '#fef9c3', borderColor: '#fef08a', borderWidth: 1 },
  badgeTextPending: { color: '#a16207' },
  badgeText: { fontSize: 10, fontWeight: '900' },
  actionButtons: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  statusBtn: { padding: 5 },
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
