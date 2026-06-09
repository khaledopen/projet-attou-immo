import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';

const OwnerVisits = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await api.get('/visits/owner');
      setVisits(response.data);
    } catch (error: any) {
      console.log('Erreur visites:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleStatusChange = async (id, newStatut) => {
    try {
      await api.patch(`/visits/${id}/status`, { statut: newStatut });
      Alert.alert('Succès', `Visite ${newStatut.toLowerCase()}`);
      fetchVisits();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>
          {new Date(item.dateProposee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {new Date(item.dateProposee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={[
          styles.badge, 
          item.statut === 'ACCEPTEE' ? styles.badgeSuccess : (item.statut === 'REFUSEE' ? styles.badgeDanger : styles.badgePending)
        ]}>
          <Text style={[
            styles.badgeText,
            item.statut === 'ACCEPTEE' ? styles.badgeTextSuccess : (item.statut === 'REFUSEE' ? styles.badgeTextDanger : styles.badgeTextPending)
          ]}>{item.statut}</Text>
        </View>
      </View>
      
      <Text style={styles.propertyTitle}>{item.annonce?.titre || 'Annonce'}</Text>
      
      <View style={styles.tenantInfo}>
        <Ionicons name="person-circle-outline" size={20} color="#64748b" />
        <Text style={styles.tenantName}>{item.locataire?.prenom || 'Locataire'} {item.locataire?.nom || ''}</Text>
      </View>

      {item.statut === 'EN_ATTENTE' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnReject} onPress={() => handleStatusChange(item.id, 'REFUSEE')}>
            <Text style={styles.btnTextReject}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAccept} onPress={() => handleStatusChange(item.id, 'ACCEPTEE')}>
            <Text style={styles.btnTextAccept}>Accepter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0ea5e9" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion des Visites</Text>
      </View>
      <FlatList
        data={visits}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVisits(); }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0ea5e9' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'capitalize' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeSuccess: { backgroundColor: '#f0fdf4' },
  badgePending: { backgroundColor: '#fff7ed' },
  badgeDanger: { backgroundColor: '#fef2f2' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextSuccess: { color: '#15803d' },
  badgeTextPending: { color: '#c2410c' },
  badgeTextDanger: { color: '#ef4444' },
  propertyTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  tenantInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  tenantName: { marginLeft: 8, fontSize: 14, color: '#64748b', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  btnReject: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', alignItems: 'center' },
  btnAccept: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center' },
  btnTextReject: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  btnTextAccept: { color: '#fff', fontWeight: '700', fontSize: 14 }
});

export default OwnerVisits;
