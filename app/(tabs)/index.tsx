import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosInstance';
import { BASE_URL } from '../../api/config';
import PropertyCard from '../../components/PropertyCard';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSocket } from '../../hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { playNotificationSound } from '../../utils/notificationSound';

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

const ExplorerScreen = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const socket = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('Chargement de la localisation...');
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [favorites, setFavorites] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Abidjan, Côte d\'Ivoire');
        setLocationPermissionGranted(false);
        return;
      }
      setLocationPermissionGranted(true);
      
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (reverseGeocode.length > 0) {
        const item = reverseGeocode[0];
        const city = item.city || item.subregion || 'Abidjan';
        const district = item.district || item.name || '';
        setLocationName(`${district ? district + ', ' : ''}${city}`);
      } else {
        setLocationName('Abidjan, Côte d\'Ivoire');
      }
    } catch (error) {
      console.log('Location error:', error);
      setLocationName('Abidjan, Côte d\'Ivoire');
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async (propertyItem: any) => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      let favList = stored ? JSON.parse(stored) : [];
      const exists = favList.some((item: any) => item.id === propertyItem.id);
      
      if (exists) {
        favList = favList.filter((item: any) => item.id !== propertyItem.id);
      } else {
        favList.push(propertyItem);
      }
      
      await AsyncStorage.setItem('favorites', JSON.stringify(favList));
      setFavorites(favList);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await api.get('/notifications');
      const unreads = response.data.filter((n: any) => !n.lu).length;
      setUnreadCount(unreads);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.multiRemove(['userToken', 'userData']);
        setIsLoggedIn(false);
      } else {
        console.log('Erreur count notifications unread:', error.message || error);
      }
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties?statut=PUBLIEE');
      setProperties(response.data);
    } catch (error) {
      console.error('Erreur Explorer:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
      fetchUnreadNotifications();
      checkAuthStatus();
      loadFavorites();
    }, [])
  );

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadNotifications();
      checkAuthStatus();
      loadFavorites();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleRealtimeUpdate = () => {
        console.log('Realtime update received via socket, refreshing listings...');
        playNotificationSound();
        fetchProperties();
      };
      
      const handleNotificationUpdate = () => {
        console.log('New notification socket event, refreshing unread count...');
        playNotificationSound();
        fetchUnreadNotifications();
      };
      
      socket.on('property_created', handleRealtimeUpdate);
      socket.on('property_updated', handleRealtimeUpdate);
      socket.on('property_deleted', handleRealtimeUpdate);
      socket.on('notification_created', handleNotificationUpdate);
      
      return () => {
        socket.off('property_created', handleRealtimeUpdate);
        socket.off('property_updated', handleRealtimeUpdate);
        socket.off('property_deleted', handleRealtimeUpdate);
        socket.off('notification_created', handleNotificationUpdate);
      };
    }
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProperties();
    fetchUnreadNotifications();
    checkAuthStatus();
    requestLocationPermission();
    loadFavorites();
  };

  const handlePropertyPress = (id: string) => {
    router.push(`/property/${id}`);
  };

  const handleNotificationPress = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setShowAuthModal(true);
    } else {
      router.push('/modal');
    }
  };

  const filteredProperties = properties.filter((item: any) => {
    // Category Filter
    if (selectedCategory !== 'Tous') {
      const type = item.typeBien?.toLowerCase().trim();
      const cat = selectedCategory.toLowerCase().trim();
      if (type !== cat) {
        return false;
      }
    }

    // Min Price Filter
    if (minPrice) {
      const minVal = parseFloat(minPrice);
      if (!isNaN(minVal) && item.prix < minVal) return false;
    }

    // Max Price Filter
    if (maxPrice) {
      const maxVal = parseFloat(maxPrice);
      if (!isNaN(maxVal) && item.prix > maxVal) return false;
    }

    // Search Query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const titreMatch = item.titre?.toLowerCase().includes(query);
    const typeMatch = item.typeBien?.toLowerCase().includes(query);
    const villeMatch = item.bien?.adresse?.ville?.toLowerCase().includes(query);
    const rueMatch = item.bien?.adresse?.rue?.toLowerCase().includes(query);
    const priceMatch = item.prix?.toString().includes(query);
    
    return titreMatch || typeMatch || villeMatch || rueMatch || priceMatch;
  });

  const hasActiveFilters = minPrice !== '' || maxPrice !== '';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TypewriterText text="Bonjour" style={styles.welcomeText} />
            <Text style={styles.brandText} numberOfLines={1}>Trouvez votre logement</Text>
          </View>
          <TouchableOpacity style={styles.notificationBadge} onPress={handleNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color="#0284c7" />
            {unreadCount > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Ville, quartier..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]} activeOpacity={0.8} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={22} color={hasActiveFilters ? '#fff' : '#0284c7'} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {['Tous', 'Appartement', 'Studio', 'Maison', 'Villa', 'Chambre'].map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.countText}>
          {filteredProperties.length} {filteredProperties.length > 1 ? 'logements trouvés' : 'logement trouvé'}
        </Text>
        
        {filteredProperties.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucune annonce ne correspond à votre recherche.</Text>
          </View>
        ) : (
          filteredProperties.map((item: any) => (
            <PropertyCard 
              key={item.id} 
              property={{
                id: item.id,
                title: item.titre,
                price: item.prix,
                address: `${item.bien?.adresse?.ville || ''}, ${item.bien?.adresse?.rue || ''}`,
                city: item.bien?.adresse?.ville || '',
                status: item.statut || 'AVAILABLE',
                type: item.typeBien,
                imageUrl: item.photos && item.photos.length > 0 ? item.photos[0].url : null,
                photosCount: item.photos?.length || 0,
                chambres: item.bien?.nombreChambres || 0,
                surface: item.surface || 0,
              }}
              isFavorite={favorites.some((fav: any) => fav.id === item.id)}
              onToggleFavorite={() => toggleFavorite(item)}
              onPress={() => handlePropertyPress(item.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Auth Prompt Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIndicator} />
            
            <View style={styles.modalIconContainer}>
              <Ionicons name="lock-closed" size={32} color="#0ea5e9" />
            </View>

            <Text style={styles.modalTitle}>Rejoignez AttouHome ✨</Text>
            <Text style={styles.modalSubtitle}>
              Connectez-vous ou créez un compte gratuitement en quelques secondes pour voir les détails complets de cette annonce, planifier des visites et contacter le propriétaire.
            </Text>

            <TouchableOpacity 
              style={styles.modalPrimaryBtn} 
              onPress={() => {
                setShowAuthModal(false);
                router.push('/login');
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalSecondaryBtn} 
              onPress={() => {
                setShowAuthModal(false);
                router.push('/register');
              }}
            >
              <Text style={styles.modalSecondaryBtnText}>Créer un compte</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowAuthModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Continuer la visite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Price Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => { Keyboard.dismiss(); }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalSheet}>
                <View style={styles.modalIndicator} />
                <Text style={styles.modalTitle}>Filtrer par prix 💰</Text>
                <Text style={styles.modalSubtitle}>Définissez une fourchette de prix (FCFA / mois)</Text>

                <View style={styles.priceRow}>
                  <View style={styles.priceInputGroup}>
                    <Text style={styles.priceLabel}>Min</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={minPrice}
                      onChangeText={setMinPrice}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <Text style={styles.priceSeparator}>—</Text>
                  <View style={styles.priceInputGroup}>
                    <Text style={styles.priceLabel}>Max</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="∞"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => { Keyboard.dismiss(); setShowFilterModal(false); }}>
                  <Text style={styles.modalPrimaryBtnText}>Appliquer les filtres</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => { Keyboard.dismiss(); setMinPrice(''); setMaxPrice(''); setShowFilterModal(false); }}>
                  <Text style={styles.modalSecondaryBtnText}>Réinitialiser</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, gap: 12 },
  headerLeft: { flex: 1, marginRight: 8 },
  welcomeText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  brandText: { fontSize: 19, color: '#0f172a', fontWeight: '800', marginTop: 2 },
  notificationBadge: { width: 44, height: 44, backgroundColor: '#e0f2fe', borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  dot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4, borderWidth: 1.5, borderColor: '#e0f2fe' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 6, borderRadius: 20 },
  searchInput: { flex: 1, marginLeft: 10, color: '#0f172a', fontSize: 16, paddingVertical: 0 },
  filterButton: { width: 44, height: 44, backgroundColor: '#e0f2fe', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  categoriesContainer: { marginBottom: 20, maxHeight: 50 },
  categoriesContent: { gap: 10, paddingRight: 20 },
  categoryPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9' },
  categoryPillActive: { backgroundColor: '#0284c7' },
  categoryText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  categoryTextActive: { color: '#fff' },
  countText: { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 15 },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationHeaderText: { color: '#0ea5e9', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 10, color: '#94a3b8' },
  
  // Custom Bottom Sheet style Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, alignItems: 'center' },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#cbd5e1', borderRadius: 2.5, marginBottom: 20 },
  modalIconContainer: { width: 70, height: 70, backgroundColor: '#f0f9ff', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 25, paddingHorizontal: 10 },
  modalPrimaryBtn: { backgroundColor: '#0ea5e9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#0ea5e9', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalSecondaryBtn: { backgroundColor: '#fff', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 15 },
  modalSecondaryBtnText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  modalCloseBtn: { paddingVertical: 10 },
  modalCloseBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  filterButtonActive: { backgroundColor: '#0284c7' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 25, width: '100%' },
  priceInputGroup: { flex: 1 },
  priceLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  priceInput: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a', textAlign: 'center' },
  priceSeparator: { fontSize: 18, color: '#cbd5e1', fontWeight: '700', marginTop: 18 }
});

export default ExplorerScreen;
