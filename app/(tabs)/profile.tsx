import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Erreur profil:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Se déconnecter de AttouHome Pro ?', [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Déconnexion', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['userToken', 'userData']);
          router.replace('/login');
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0ea5e9" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Profil Pro 👤</Text>
      
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nom?.[0] || 'P'}</Text>
        </View>
        <Text style={styles.userName}>{user ? `${user.prenom} ${user.nom}` : 'Propriétaire'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.raisonSociale}>{user?.raisonSociale || 'Indépendant'}</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="business-outline" size={22} color="#0ea5e9" />
          <Text style={styles.menuText}>Informations agence</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="stats-chart-outline" size={22} color="#0ea5e9" />
          <Text style={styles.menuText}>Statistiques de location</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={[styles.menuText, { color: '#ef4444' }]}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 25, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 30 },
  profileHeader: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 100, height: 100, borderRadius: 30, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  userEmail: { fontSize: 14, color: '#64748b', marginTop: 5 },
  raisonSociale: { fontSize: 12, fontWeight: '700', color: '#0ea5e9', backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 10 },
  menu: { backgroundColor: '#fff', borderRadius: 25, padding: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '600', color: '#1e293b' }
});

export default ProfileScreen;
