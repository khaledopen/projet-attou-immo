import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FavoritesScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Mes Favoris ❤️</Text>
      <View style={styles.emptyState}>
        <Ionicons name="heart-outline" size={80} color="#cbd5e1" />
        <Text style={styles.emptyText}>Vous n'avez pas encore de favoris.</Text>
        <Text style={styles.subText}>Cliquez sur le cœur pour sauvegarder un bien qui vous plaît.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 25, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 40 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#64748b', marginTop: 20 },
  subText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }
});

export default FavoritesScreen;
