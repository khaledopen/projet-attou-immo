import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../api/config';

const OwnerVisits = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${BASE_URL}/visits/owner`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVisits(response.data);
    } catch (error) {
      console.error('Erreur visites:', error);
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
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${BASE_URL}/visits/${id}/status`, { statut: newStatut }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Succès', `Visite ${newStatut.toLowerCase()}`);
      fetchVisits();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.dateProposee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <View style={[styles.badge, item.statut === 'ACCEPTEE' ? styles.badgeSuccess : styles.badgePending]}>
          <Text style={styles.badgeText}>{item.statut}</Text>
        </View>
      </View>
      
      <Text style={styles.propertyTitle}>{item.annonce.titre}</Text>
      
      <View style={styles.tenantInfo}>
        <Ionicons name="person-circle-outline" size={20} color="#64748b" />
        <Text style={styles.tenantName}>{item.locataire.prenom} {item.locataire.nom}</Text>
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1e3a8a" />;

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
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e3a8a' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'capitalize' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeSuccess: { backgroundColor: '#f0fdf4' },
  badgePending: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  propertyTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  tenantInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  tenantName: { marginLeft: 8, fontSize: 14, color: '#64748b', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  btnReject: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', alignItems: 'center' },
  btnAccept: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e3a8a', alignItems: 'center' },
  btnTextReject: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  btnTextAccept: { color: '#fff', fontWeight: '700', fontSize: 14 }
});

export default OwnerVisits;
