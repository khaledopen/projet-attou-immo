import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import PropertyCard from '../../components/PropertyCard';

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const isFocused = useIsFocused();

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
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

  const renderItem = ({ item }) => (
    <PropertyCard
      property={{
        id: item.id,
        title: item.titre,
        price: item.prix,
        address: `${item.bien?.adresse?.ville || ''}, ${item.bien?.adresse?.rue || ''}`,
        type: item.typeBien,
        imageUrl: item.photos?.[0]?.url || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80'
      }}
      onPress={() => router.push(`/property/${item.id}`)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Favoris ❤️</Text>
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
