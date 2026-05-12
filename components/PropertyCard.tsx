import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PropertyCard({ property, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image 
        source={{ uri: property.imageUrl || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=400' }} 
        style={styles.image} 
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.price}>{property.price.toLocaleString()} FCFA</Text>
        </View>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color="#065f46" />
          <Text style={styles.location}>{property.city}, {property.address}</Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{property.status === 'AVAILABLE' ? 'Disponible' : 'Loué'}</Text>
          </View>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Détails</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065f46',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    fontSize: 12,
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: '#065f46',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
