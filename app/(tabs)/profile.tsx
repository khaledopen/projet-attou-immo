import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';

const ProfileScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit profile states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [typeBailleur, setTypeBailleur] = useState('');
  const [updating, setUpdating] = useState(false);

  // Stats
  const [stats, setStats] = useState({ properties: 0, visits: 0, rented: 0 });

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erreur profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const userData = JSON.parse(userDataStr);
      const headers = { Authorization: `Bearer ${token}` };

      const propsRes = await api.get('/properties', { params: { proprietaireId: userData.id } });
      const visitsRes = await api.get('/visits/owner', { headers });

      const rentedCount = propsRes.data.filter((p: any) => p.statut === 'ARCHIVEE').length;

      setStats({
        properties: propsRes.data.length,
        visits: visitsRes.data.length,
        rented: rentedCount,
      });
    } catch (error) {
      console.log('Stats error:', error);
    }
  };

  useEffect(() => {
    loadUserData();
    fetchStats();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      fetchStats();
    });
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Se déconnecter de AttouHome Pro ?');
      if (confirmLogout) {
        await AsyncStorage.multiRemove(['userToken', 'userData']);
        router.replace('/login');
      }
    } else {
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
    }
  };

  const openEditModal = () => {
    setNom(user?.nom || '');
    setPrenom(user?.prenom || '');
    setTelephone(user?.telephone || '');
    setRaisonSociale(user?.raisonSociale || '');
    setTypeBailleur(user?.typeBailleur || 'PARTICULIER');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires.');
      return;
    }
    try {
      setUpdating(true);
      const res = await api.put('/auth/profile', { nom, prenom, telephone, raisonSociale, typeBailleur });
      const updatedUser = res.data.user;
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès !');
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0ea5e9" />;

  const bailleurTypes = [
    { key: 'PARTICULIER', label: '👤 Particulier' },
    { key: 'AGENCE', label: '🏢 Agence' },
    { key: 'PROMOTEUR', label: '🏗️ Promoteur' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Profil Pro 👤</Text>
      
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.prenom?.[0] || 'P'}{user?.nom?.[0] || ''}</Text>
          </View>
          <View style={styles.userInfoBlock}>
            <Text style={styles.userName}>{user ? `${user.prenom} ${user.nom}` : 'Propriétaire'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.telephone ? (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={12} color="#64748b" />
                <Text style={styles.phoneText}>{user.telephone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.badgeType}>
            <Text style={styles.badgeTypeText}>
              {user?.typeBailleur 
                ? (user.typeBailleur === 'PARTICULIER' ? '👤 Particulier' : user.typeBailleur === 'AGENCE' ? '🏢 Agence' : '🏗️ Promoteur') 
                : '👤 Indépendant'}
            </Text>
          </View>
          {user?.raisonSociale ? (
            <View style={styles.badgeRaison}>
              <Text style={styles.badgeRaisonText}>💼 {user.raisonSociale}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.editProfileBtn} onPress={openEditModal}>
          <Ionicons name="create-outline" size={18} color="#0ea5e9" />
          <Text style={styles.editProfileBtnText}>Modifier le profil</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.properties}</Text>
          <Text style={styles.statLabel}>Biens</Text>
        </View>
        <View style={[styles.statItem, styles.statItemMiddle]}>
          <Text style={[styles.statValue, { color: '#0ea5e9' }]}>{stats.visits}</Text>
          <Text style={styles.statLabel}>Visites</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.rented}</Text>
          <Text style={styles.statLabel}>Loués</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/properties')}>
          <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="business-outline" size={20} color="#10b981" />
          </View>
          <View style={styles.menuTextBlock}>
            <Text style={styles.menuText}>Mes annonces</Text>
            <Text style={styles.menuSubText}>Gérer vos biens immobiliers</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/visits')}>
          <View style={[styles.menuIconBox, { backgroundColor: '#fffbeb' }]}>
            <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
          </View>
          <View style={styles.menuTextBlock}>
            <Text style={styles.menuText}>Demandes de visite</Text>
            <Text style={styles.menuSubText}>Suivre les rendez-vous</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <View style={[styles.menuIconBox, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </View>
          <View style={styles.menuTextBlock}>
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Déconnexion</Text>
            <Text style={styles.menuSubText}>Fermer votre session</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fecaca" />
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier mon profil</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#1e293b" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre prénom"
                  placeholderTextColor="#94a3b8"
                  value={prenom}
                  onChangeText={setPrenom}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre nom"
                  placeholderTextColor="#94a3b8"
                  value={nom}
                  onChangeText={setNom}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: 07 00 00 00 00"
                  placeholderTextColor="#94a3b8"
                  value={telephone}
                  onChangeText={setTelephone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Raison sociale</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nom de votre agence (optionnel)"
                  placeholderTextColor="#94a3b8"
                  value={raisonSociale}
                  onChangeText={setRaisonSociale}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de bailleur</Text>
                <View style={styles.typeSelector}>
                  {bailleurTypes.map(type => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeOption,
                        typeBailleur === type.key && styles.typeOptionActive
                      ]}
                      onPress={() => setTypeBailleur(type.key)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        typeBailleur === type.key && styles.typeOptionTextActive
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, updating && styles.disabledSaveBtn]} 
                onPress={handleSaveProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 25 },

  // Profile Card
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  userInfoBlock: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  phoneText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  badgeType: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd' },
  badgeTypeText: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  badgeRaison: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  badgeRaisonText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  editProfileBtnText: { fontSize: 14, fontWeight: '700', color: '#0ea5e9' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statItemMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  // Menu
  menu: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTextBlock: { flex: 1 },
  menuText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  menuSubText: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  closeBtn: { padding: 8, borderRadius: 50, backgroundColor: '#f1f5f9' },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  typeOptionText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  typeOptionTextActive: { color: '#0ea5e9' },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledSaveBtn: { backgroundColor: '#cbd5e1' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
