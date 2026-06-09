import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../api/config';

const PropertyDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const flatListRef = useRef(null);
  const { width } = Dimensions.get('window');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!property?.photos || property.photos.length <= 1) return;
    const interval = setInterval(() => {
      setActivePhotoIndex((prev) => {
        const next = prev === property.photos.length - 1 ? 0 : prev + 1;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [property]);

  const checkIfFavorite = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      const favList = stored ? JSON.parse(stored) : [];
      setIsFavorite(favList.some(item => item.id === id));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    if (!property) return;
    try {
      const stored = await AsyncStorage.getItem('favorites');
      let favList = stored ? JSON.parse(stored) : [];
      if (isFavorite) {
        favList = favList.filter(item => item.id !== id);
      } else {
        favList.push(property);
      }
      await AsyncStorage.setItem('favorites', JSON.stringify(favList));
      setIsFavorite(!isFavorite);
    } catch (e) {
      console.error(e);
    }
  };


  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Détails erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du bien.');
    } finally {
      setLoading(false);
    }
  };

  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsAuthenticated(!!token);
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      fetchDetails();
      checkIfFavorite();
      setAuthChecked(true);
    }
  };

  // New state for report modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDescription, setReportDescription] = useState('');

  // Updated handler to open modal
  const openReportModal = () => setReportModalVisible(true);

  // Function to submit report with description
  const submitReport = async () => {
    try {
      await api.put(`/properties/${id}/report`, { description: reportDescription });
      Alert.alert('Signalement envoyé', 'Merci, votre signalement a été pris en compte.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      setReportModalVisible(false);
      setReportDescription('');
    } catch (err) {
      console.error('Erreur signalement:', err);
      Alert.alert('Erreur', "Impossible d'envoyer le signalement.");
    }
  };

  const handleReportAd = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour signaler cette annonce.', [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Se connecter', 
          onPress: () => router.push({ 
            pathname: '/login', 
            params: { redirectTo: `/property/${id}` } 
          }) 
        }
      ]);
      return;
    }
    setReportModalVisible(true);
  };

  const handleContactPress = () => {
    Alert.alert(
      'Demande de visite requise 📅',
      'Pour entrer en contact avec le propriétaire, vous devez d\'abord effectuer une demande de visite en bas de l\'écran. Une fois acceptée, votre salon de discussion sera automatiquement créé.',
      [{ text: 'OK' }]
    );
  };



  useEffect(() => {
    checkAuthentication();
  }, [id]);

  const handleRequestVisitPress = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour demander une visite.', [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Se connecter', 
          onPress: () => router.push({ 
            pathname: '/login', 
            params: { redirectTo: `/property/${id}` } 
          }) 
        }
      ]);
      return;
    }
    setShowCalendar(true);
  };

  const confirmVisitRequest = async () => {
    if (!selectedDate) {
      Alert.alert('Attention', 'Veuillez choisir une date pour la visite.');
      return;
    }
    try {
      setRequesting(true);

      await api.post('/visits', {
        annonceId: id,
        dateProposee: new Date(selectedDate).toISOString(),
        message: "Je souhaiterais visiter ce bien dès que possible."
      });

      setShowCalendar(false);
      Alert.alert('Succès', 'Votre demande de visite a été envoyée au propriétaire !');
    } catch (error) {
      console.error('Visite erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
    } finally {
      setRequesting(false);
    }
  };

  if (!authChecked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }



  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!property) return null;

  return (
    <View style={styles.container}>
      <ScrollView>
        {property.photos && property.photos.length > 0 ? (
          <View>
            <FlatList
              ref={flatListRef}
              data={property.photos}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setActivePhotoIndex(index);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item.url, headers: { 'bypass-tunnel-reminder': 'true' } }} style={[styles.image, { width }]} />
              )}
            />
            <View style={styles.paginationDots}>
              {property.photos.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, activePhotoIndex === index ? styles.activeDot : null]}
                />
              ))}
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80' }}
            style={styles.image}
          />
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#ef4444" : "#000"} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{property.typeBien}</Text>
            </View>
            <Text style={styles.price}>{property.prix.toLocaleString()} FCFA / mois</Text>
          </View>

          <Text style={styles.title}>{property.titre}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#0ea5e9" />
            <Text style={styles.location}>{property.bien.adresse.ville}, {property.bien.adresse.rue}</Text>
          </View>

          <View style={styles.specs}>
            <View style={styles.specItem}>
              <Ionicons name="cube-outline" size={20} color="#64748b" />
              <Text style={styles.specText}>{property.surface} m²</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="bed-outline" size={20} color="#64748b" />
              <Text style={styles.specText}>{property.bien.nombreChambres} Ch.</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="apps-outline" size={20} color="#64748b" />
              <Text style={styles.specText}>{property.nombrePieces} Pièces</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{property.description}</Text>



          <View style={styles.ownerCard}>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerInitial}>{property.proprietaire.nom[0]}</Text>
              </View>
              <View>
                <Text style={styles.ownerName}>{property.proprietaire.prenom} {property.proprietaire.nom}</Text>
                <Text style={styles.ownerRole}>Propriétaire</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.contactIcon} onPress={handleContactPress}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#0ea5e9" />
            </TouchableOpacity>
          </View>

          {property.statut === 'SUSPENDUE' ? (
            <View style={styles.reportSection}>
              <Text style={styles.reportTitle}>Annonce signalée</Text>
              <Text style={styles.reportReason}>{property.raisonSignalement || 'Aucune description fournie.'}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.reportAdButton} onPress={handleReportAd}>
              <Ionicons name="flag-outline" size={16} color="#ef4444" />
              <Text style={styles.reportAdText}>Signaler cette annonce (Photo malveillante ou inappropriée)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.requestButton} onPress={handleRequestVisitPress}>
          <Text style={styles.requestButtonText}>Demander une visite</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de saisie du motif de signalement */}
      <Modal visible={reportModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pourquoi signalez‑vous cette annonce ?</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Décrivez le problème..."
                placeholderTextColor="#94a3b8"
                multiline
                value={reportDescription}
                onChangeText={setReportDescription}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setReportModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={submitReport}>
                  <Text style={styles.modalConfirmText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCalendar} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir une date</Text>
            <Calendar
              minDate={today}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#0ea5e9' }
              }}
              theme={{
                todayTextColor: '#0ea5e9',
                arrowColor: '#0ea5e9',
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCalendar(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmVisitRequest} disabled={requesting}>
                {requesting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 350 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  thumbnailContainer: {
    position: 'absolute',
    top: 280,
    right: 20,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  thumbnailWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnailWrapper: {
    borderColor: '#0ea5e9',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  content: { padding: 25, borderTopLeftRadius: 35, borderTopRightRadius: 35, backgroundColor: '#fff', marginTop: -30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 10 },
  typeBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexShrink: 1 },
  typeText: { color: '#0ea5e9', fontSize: 12, fontWeight: 'bold' },
  price: { fontSize: 16, fontWeight: '900', color: '#0ea5e9', flexShrink: 0 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  location: { color: '#64748b', marginLeft: 5, fontSize: 14, flexShrink: 1 },
  specs: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderRadius: 20, marginBottom: 25, gap: 8 },
  specItem: { flex: 1, alignItems: 'center' },
  specText: { marginTop: 5, fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  description: { color: '#64748b', lineHeight: 22, marginBottom: 25 },
  equipments: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  equipmentBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  equipmentText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  ownerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderRadius: 20, marginBottom: 40, gap: 10 },
  ownerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  ownerAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  ownerInitial: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  ownerRole: { fontSize: 12, color: '#94a3b8' },
  contactIcon: { width: 45, height: 45, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  footer: { padding: 25, borderTopWidth: 1, borderColor: '#f1f5f9' },
  requestButton: { backgroundColor: '#0ea5e9', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#0ea5e9', shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  requestButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledVisitContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#fde68a' },
  disabledVisitText: { flex: 1, color: '#92400e', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  paginationDots: { position: 'absolute', bottom: 15, flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#fff', width: 12, height: 12, borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#0f172a' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalInput: {
    height: 100,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    color: '#1e293b',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  modalCancelButton: { flex: 1, padding: 15, backgroundColor: '#f1f5f9', borderRadius: 12, marginRight: 10, alignItems: 'center' },
  modalConfirmButton: { flex: 1, padding: 15, backgroundColor: '#0ea5e9', borderRadius: 12, marginLeft: 10, alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
  modalConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  unauthContainer: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center' },
  unauthContent: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  unauthIconWrapper: { width: 80, height: 80, backgroundColor: '#f0f9ff', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  unauthTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  unauthSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  benefitList: { width: '100%', marginBottom: 30, gap: 12, paddingHorizontal: 10 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  unauthLoginBtn: { backgroundColor: '#0ea5e9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 },
  unauthLoginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  unauthRegisterBtn: { backgroundColor: '#fff', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
  unauthRegisterBtnText: { color: '#0ea5e9', fontSize: 16, fontWeight: '700' },
  backButtonUnauth: { position: 'absolute', top: 50, left: 20, backgroundColor: '#fff', padding: 10, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reportAdButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 14, borderRadius: 15, borderWidth: 1, borderColor: '#fee2e2', marginTop: 15, marginBottom: 25 },
  reportAdText: { color: '#ef4444', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  reportSection: { backgroundColor: '#fee2e2', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#fca5a5' },
  reportTitle: { color: '#dc2626', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  reportReason: { color: '#7f1d1d', fontSize: 14, lineHeight: 20 }
});

export default PropertyDetails;
