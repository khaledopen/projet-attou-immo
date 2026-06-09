import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';

const ProfileScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Edit profile states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [updating, setUpdating] = useState(false);

  // Visit requests states
  const [visitsModalVisible, setVisitsModalVisible] = useState(false);
  const [visits, setVisits] = useState([]);
  const [fetchingVisits, setFetchingVisits] = useState(false);

  // Edit date states
  const [editingVisitId, setEditingVisitId] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [updatingDate, setUpdatingDate] = useState(false);
  const [dateEditModalVisible, setDateEditModalVisible] = useState(false);

  const fetchVisits = async () => {
    try {
      setFetchingVisits(true);
      const res = await api.get('/visits/tenant');
      setVisits(res.data);
    } catch (error) {
      console.error('Error fetching tenant visits:', error);
    } finally {
      setFetchingVisits(false);
    }
  };

  const openVisitsModal = () => {
    fetchVisits();
    setVisitsModalVisible(true);
  };

  const handleCancelVisit = async (visitId: string) => {
    Alert.alert(
      'Confirmer l\'annulation',
      'Voulez-vous vraiment annuler cette demande de visite ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/visits/${visitId}/cancel`);
              Alert.alert('Succès', 'Votre demande de visite a été annulée.');
              fetchVisits();
            } catch (error: any) {
              console.error('Cancel visit error:', error);
              const errMsg = error.response?.data?.message || 'Impossible d\'annuler la visite.';
              Alert.alert('Erreur', errMsg);
            }
          }
        }
      ]
    );
  };

  const openDateEditor = (visitId: string, currentDate: string) => {
    setEditingVisitId(visitId);
    setNewDate(new Date(currentDate));
    setVisitsModalVisible(false); // Ferme temporairement la liste pour éviter les overlays
    setTimeout(() => {
      setShowDatePicker(true);
    }, 400);
  };

  const handleDateChange = async (event: any, selectedDate: any) => {
    setShowDatePicker(false);
    
    if (event.type === 'dismissed' || !selectedDate) {
      setEditingVisitId(null);
      setVisitsModalVisible(true); // Réouvre le modal des visites
      return;
    }

    // Sauvegarder directement la nouvelle date sélectionnée
    try {
      setUpdatingDate(true);
      await api.patch(`/visits/${editingVisitId}/date`, { dateProposee: selectedDate.toISOString() });
      Alert.alert('Succès', 'La date de visite a été modifiée avec succès.');
      setEditingVisitId(null);
      fetchVisits();
    } catch (error: any) {
      console.error('Update date error:', error);
      const errMsg = error.response?.data?.message || 'Impossible de modifier la date.';
      Alert.alert('Erreur', errMsg);
    } finally {
      setUpdatingDate(false);
      setVisitsModalVisible(true); // Réouvre le modal des visites dans tous les cas
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Souhaitez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Déconnexion', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['userToken', 'userData']);
          router.replace('/(tabs)');
        }
      }
    ]);
  };

  const openEditModal = () => {
    setNom(user?.nom || '');
    setPrenom(user?.prenom || '');
    setTelephone(user?.telephone || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires.');
      return;
    }
    try {
      setUpdating(true);
      const res = await api.put('/auth/profile', { nom, prenom, telephone });
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!isLoggedIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Mon Profil</Text>
        
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name="person-outline" size={40} color="#94a3b8" />
          </View>
          <Text style={styles.userName}>Bienvenue sur AttouHome</Text>
          <Text style={styles.userEmail}>Connectez-vous pour voir et gérer votre profil complet.</Text>
        </View>

        <View style={styles.authBox}>
          <TouchableOpacity style={styles.unauthBtn} onPress={() => router.push({ pathname: '/login', params: { redirectTo: '/(tabs)/profile' } })}>
            <Text style={styles.unauthBtnText}>Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.unauthSecondaryBtn} onPress={() => router.push({ pathname: '/register', params: { redirectTo: '/(tabs)/profile' } })}>
            <Text style={styles.unauthSecondaryBtnText}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Mon Profil</Text>
      
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nom?.[0] || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@exemple.com'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={openEditModal}>
          <Ionicons name="settings-outline" size={22} color="#1e293b" />
          <Text style={styles.menuText}>Paramètres du compte</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/favorites')}>
          <Ionicons name="heart-outline" size={22} color="#1e293b" />
          <Text style={styles.menuText}>Mes Favoris</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={openVisitsModal}>
          <Ionicons name="calendar-outline" size={22} color="#1e293b" />
          <Text style={styles.menuText}>Mes demandes de visite</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={[styles.menuText, { color: '#ef4444' }]}>Déconnexion</Text>
          <Ionicons name="chevron-forward" size={18} color="#ef4444" style={{ opacity: 0 }} />
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
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
                placeholder="Votre numéro de téléphone"
                placeholderTextColor="#94a3b8"
                value={telephone}
                onChangeText={setTelephone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, updating && styles.disabledSaveBtn]} 
              onPress={handleSaveProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Visits List Modal */}
      <Modal
        visible={visitsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisitsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mes demandes de visite</Text>
              <TouchableOpacity onPress={() => setVisitsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {fetchingVisits ? (
              <ActivityIndicator style={{ flex: 1 }} color="#0ea5e9" />
            ) : visits.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={60} color="#94a3b8" />
                <Text style={styles.emptyText}>Aucune demande de visite enregistrée.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {visits.map((visit: any) => {
                  const visitDate = new Date(visit.dateProposee).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  let statusBg = '#f1f5f9';
                  let statusColor = '#475569';
                  if (visit.statut === 'ACCEPTEE') {
                    statusBg = '#dcfce7';
                    statusColor = '#15803d';
                  } else if (visit.statut === 'REFUSEE') {
                    statusBg = '#fee2e2';
                    statusColor = '#b91c1c';
                  } else if (visit.statut === 'ANNULEE') {
                    statusBg = '#f1f5f9';
                    statusColor = '#64748b';
                  } else if (visit.statut === 'EN_ATTENTE') {
                    statusBg = '#fef9c3';
                    statusColor = '#a16207';
                  }

                  return (
                    <View key={visit.id} style={styles.visitCard}>
                      <View style={styles.visitHeader}>
                        <Text style={styles.visitPropTitle} numberOfLines={1}>
                          {visit.annonce?.titre || 'Bien sans titre'}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>{visit.statut}</Text>
                        </View>
                      </View>

                      <Text style={styles.visitDateText}>
                        <Ionicons name="time-outline" size={14} color="#64748b" /> Proposé le : {visitDate}
                      </Text>

                      {visit.message && (
                        <Text style={styles.visitMsgText} numberOfLines={2}>
                          "{visit.message}"
                        </Text>
                      )}

                      {visit.statut === 'EN_ATTENTE' && (
                        <View style={styles.visitActions}>
                          <TouchableOpacity
                            style={styles.editDateBtn}
                            onPress={() => openDateEditor(visit.id, visit.dateProposee)}
                          >
                            <Ionicons name="calendar-outline" size={16} color="#0ea5e9" />
                            <Text style={styles.editDateBtnText}>Modifier la date</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelVisitBtn}
                            onPress={() => handleCancelVisit(visit.id)}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                            <Text style={styles.cancelVisitBtnText}>Annuler</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* DatePicker Dialogue */}
      {showDatePicker && (
        <DateTimePicker
          value={newDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
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
  roleBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 10 },
  roleText: { color: '#0ea5e9', fontSize: 10, fontWeight: '800' },
  menu: { backgroundColor: '#fff', borderRadius: 25, padding: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '600', color: '#1e293b' },
  authBox: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, alignItems: 'center' },
  unauthBtn: { backgroundColor: '#0ea5e9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 },
  unauthBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  unauthSecondaryBtn: { backgroundColor: '#fff', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
  unauthSecondaryBtnText: { color: '#0ea5e9', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  textInput: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  saveBtn: { backgroundColor: '#0ea5e9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 15, shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 },
  disabledSaveBtn: { backgroundColor: '#cbd5e1' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 10, textAlign: 'center' },
  visitCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  visitPropTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '800' },
  visitDateText: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  visitMsgText: { fontSize: 13, color: '#475569', fontStyle: 'italic', backgroundColor: '#fff', padding: 8, borderRadius: 10, marginBottom: 10 },
  cancelVisitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', paddingVertical: 10, borderRadius: 12 },
  cancelVisitBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  visitActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editDateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', paddingVertical: 10, borderRadius: 12 },
  editDateBtnText: { color: '#0ea5e9', fontSize: 12, fontWeight: '700', marginLeft: 4 }
});

export default ProfileScreen;
