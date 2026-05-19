import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
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


  const fetchDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Détails erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du bien.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    checkIfFavorite();
  }, [id]);

  const handleRequestVisit = async () => {
    try {
      setRequesting(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Connexion requise', 'Veuillez vous connecter pour demander une visite.', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/login') }
        ]);
        return;
      }

      await axios.post(`${BASE_URL}/visits`, {
        annonceId: id,
        dateProposee: new Date(Date.now() + 86400000 * 2).toISOString(), // Dans 2 jours
        message: "Je souhaiterais visiter ce bien dès que possible."
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Succès', 'Votre demande de visite a été envoyée au propriétaire !');
    } catch (error) {
      console.error('Visite erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
    } finally {
      setRequesting(false);
    }
  };

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
        <Image 
          source={{ uri: property.photos?.[activePhotoIndex]?.url || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80' }} 
          style={styles.image} 
        />
        
        {property.photos && property.photos.length > 0 && (
          <View style={styles.thumbnailContainer}>
            {property.photos.slice(0, 3).map((photo, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => setActivePhotoIndex(index)}
                style={[
                  styles.thumbnailWrapper,
                  activePhotoIndex === index && styles.activeThumbnailWrapper
                ]}
              >
                <Image source={{ uri: photo.url }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </View>
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

          <Text style={styles.sectionTitle}>Équipements</Text>
          <View style={styles.equipments}>
            {property.bien.equipements.map((item, index) => (
              <View key={index} style={styles.equipmentBadge}>
                <Text style={styles.equipmentText}>{item}</Text>
              </View>
            ))}
          </View>

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
            <TouchableOpacity style={styles.contactIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#0ea5e9" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.requestButton}
          onPress={handleRequestVisit}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.requestButtonText}>Demander une visite</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  typeBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  typeText: { color: '#0ea5e9', fontSize: 12, fontWeight: 'bold' },
  price: { fontSize: 18, fontWeight: '900', color: '#0ea5e9' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  location: { color: '#64748b', marginLeft: 5, fontSize: 14 },
  specs: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#f8fafc', borderRadius: 20, marginBottom: 25 },
  specItem: { alignItems: 'center' },
  specText: { marginTop: 5, fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  description: { color: '#64748b', lineHeight: 22, marginBottom: 25 },
  equipments: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  equipmentBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  equipmentText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  ownerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderRadius: 20, marginBottom: 40 },
  ownerInfo: { flexDirection: 'row', alignItems: 'center' },
  ownerAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  ownerInitial: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  ownerRole: { fontSize: 12, color: '#94a3b8' },
  contactIcon: { width: 45, height: 45, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  footer: { padding: 25, borderTopWidth: 1, borderColor: '#f1f5f9' },
  requestButton: { backgroundColor: '#0ea5e9', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#0ea5e9', shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  requestButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default PropertyDetails;
