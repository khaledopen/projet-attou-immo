import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';

const TypewriterText = ({ text, style }: { text: string; style: any }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => {
        if (index < text.length) {
          const nextChar = text.charAt(index);
          index++;
          return prev + nextChar;
        } else {
          clearInterval(intervalId);
          return prev;
        }
      });
    }, 120);
    return () => clearInterval(intervalId);
  }, [text]);

  return <Text style={style}>{displayedText}</Text>;
};

const OwnerDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState({ properties: 0, visits: 0 });
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('[Dashboard] No token found, redirecting to login...');
        router.replace('/login');
        return;
      }
      const userDataStr = await AsyncStorage.getItem('userData');
      const headers = { Authorization: `Bearer ${token}` };

      let proprietaireId = undefined;
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
        proprietaireId = userData.id;
      }

      // Récupérer les propriétés pour les compter
      const propsRes = await api.get('/properties', { 
        params: proprietaireId ? { proprietaireId } : {} 
      });
      
      // Fetch visits
      const visitsRes = await api.get('/visits/owner');
      
      setStats({
        properties: propsRes.data.length,
        visits: visitsRes.data.length
      });
      setRecentVisits(visitsRes.data.slice(0, 3));
    } catch (error: any) {
      console.error('Erreur dashboard:', error);
      if (error.response && error.response.status === 401) {
        console.log('[Dashboard] Session expired (401), clearing storage and redirecting to login...');
        await AsyncStorage.multiRemove(['userToken', 'userData']);
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
          <TypewriterText text="Bonjour," style={styles.welcomeText} />
          <Text style={styles.brandText}>{user ? `${user.prenom} ${user.nom}` : 'Propriétaire'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-property')}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.properties}</Text>
          <Text style={styles.statLabel}>Mes Biens</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#0ea5e9' }]}>
          <Text style={[styles.statValue, { color: '#fff' }]}>{stats.visits}</Text>
          <Text style={[styles.statLabel, { color: '#e0f2fe' }]}>Visites reçues</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Demandes récentes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/visits')}>
          <Text style={styles.seeMore}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {recentVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>Aucune demande de visite pour le moment.</Text>
        </View>
      ) : (
        recentVisits.map((visit) => (
          <View key={visit.id} style={styles.visitCard}>
            <View style={styles.visitInfo}>
              <Text style={styles.tenantName}>{visit.locataire?.prenom || 'Locataire'} {visit.locataire?.nom || ''}</Text>
              <Text style={styles.propertyName}>{visit.annonce?.titre || 'Annonce'}</Text>
              <Text style={styles.visitDate}>
                <Ionicons name="time-outline" size={12} /> {visit.dateProposee ? `${new Date(visit.dateProposee).toLocaleDateString('fr-FR')} à ${new Date(visit.dateProposee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Date non définie'}
              </Text>
            </View>
            <View style={[styles.statusBadge, visit.statut === 'ACCEPTEE' ? styles.statusAccepted : styles.statusPending]}>
              <Text style={[styles.statusText, visit.statut === 'ACCEPTEE' ? styles.statusTextAccepted : styles.statusTextPending]}>
                {visit.statut}
              </Text>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity 
        style={styles.quickAction}
        onPress={() => router.push('/add-property')}
      >
        <Ionicons name="home-outline" size={24} color="#0ea5e9" />
        <Text style={styles.quickActionText}>Publier une nouvelle annonce</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  brandText: {
    fontSize: 26,
    color: '#0f172a',
    fontWeight: '800',
  },
  addButton: {
    width: 50,
    height: 50,
    backgroundColor: '#0ea5e9',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0ea5e9',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  seeMore: {
    color: '#0ea5e9',
    fontWeight: '600',
    fontSize: 14,
  },
  visitCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  visitInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  propertyName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  visitDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusPending: {
    backgroundColor: '#fff7ed',
  },
  statusAccepted: {
    backgroundColor: '#f0fdf4',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextPending: {
    color: '#ea580c',
  },
  statusTextAccepted: {
    color: '#16a34a',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  quickActionText: {
    flex: 1,
    marginLeft: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
  },
  emptyText: {
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default OwnerDashboard;
