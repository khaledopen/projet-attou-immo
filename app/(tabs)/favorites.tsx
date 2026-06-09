import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import PropertyCard from '../../components/PropertyCard';
import api from '../../api/axiosInstance';
import { BASE_URL } from '../../api/config';

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const isFocused = useIsFocused();

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      let storedFavs = stored ? JSON.parse(stored) : [];
      
      // Récupérer les propriétés fraîches depuis le backend pour s'assurer que les photos/détails sont à jour et ne disparaissent jamais !
      const response = await api.get('/properties');
      const freshProperties = response.data;
      
      // Match stored IDs with fresh properties
      const storedIds = storedFavs.map((item: any) => typeof item === 'string' ? item : item.id);
      const activeFavs = freshProperties.filter((p: any) => storedIds.includes(p.id));
      
      setFavorites(activeFavs);
    } catch (error: any) {
      console.log('Erreur chargement favoris:', error.message || error);
      // Fallback offline
      const stored = await AsyncStorage.getItem('favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      } else {
        setFavorites([]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadFavorites();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const toggleFavorite = async (propertyItem: any) => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      let favList = stored ? JSON.parse(stored) : [];
      favList = favList.filter((item: any) => item.id !== propertyItem.id);
      await AsyncStorage.setItem('favorites', JSON.stringify(favList));
      setFavorites(favList);
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }) => (
    <PropertyCard
      property={{
        id: item.id,
        title: item.titre,
        price: item.prix,
        address: `${item.bien?.adresse?.ville || ''}, ${item.bien?.adresse?.rue || ''}`,
        city: item.bien?.adresse?.ville || '',
        status: item.statut || 'AVAILABLE',
        type: item.typeBien,
        imageUrl: item.photos?.[0]?.url || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
        photosCount: item.photos?.length || 0,
        chambres: item.bien?.nombreChambres || 0,
        surface: item.surface || 0,
      }}
      isFavorite={true}
      onToggleFavorite={() => toggleFavorite(item)}
      onPress={() => router.push(`/property/${item.id}`)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Favoris</Text>
      </View>
      
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucun favori pour le moment.</Text>
            <Text style={styles.subText}>Cliquez sur le cœur pour sauvegarder un bien qui vous plaît.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '900', color: '#0ea5e9' },
  list: { padding: 20 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#64748b', marginTop: 20 },
  subText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }
});

export default FavoritesScreen;
