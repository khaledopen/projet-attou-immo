import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PropertyCard({ property, isFavorite = false, onToggleFavorite, onPress }) {
  // Generate a deterministic rating between 4.3 and 4.9
  const getDeterministicRating = (id: string) => {
    if (!id) return '4.7';
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return (4.3 + (sum % 7) * 0.1).toFixed(1);
  };

  const rating = getDeterministicRating(property.id);
  const locationText = property.city 
    ? `${property.city} · ${property.address.split(',')[1]?.trim() || property.address}` 
    : property.address;

  const formattedPrice = typeof property.price === 'number' 
    ? `${property.price.toLocaleString('fr-FR')} FCFA` 
    : property.price;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ 
            uri: property.imageUrl || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
            headers: { 'bypass-tunnel-reminder': 'true' }
          }} 
          style={styles.image} 
          resizeMode="cover"
        />
        
        {/* Badge Coup de Cœur flottant */}
        <View style={styles.badgeCoupDeCoeur}>
          <Text style={styles.badgeCoupDeCoeurText}>✦ Coup de cœur</Text>
        </View>

        {/* Bouton favori cœur flottant */}
        {onToggleFavorite && (
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={20} 
              color={isFavorite ? "#ef4444" : "#94a3b8"} 
            />
          </TouchableOpacity>
        )}

        {/* Badge flottant du nombre d'images */}
        <View style={styles.imageCountBadge}>
          <Ionicons name="camera-outline" size={12} color="#fff" style={{ marginRight: 3 }} />
          <Text style={styles.imageCountText}>{property.photosCount || 1}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Title and Rating Row */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#fbbf24" style={{ marginRight: 3 }} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        {/* Location Row */}
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 3 }} />
          <Text style={styles.location} numberOfLines={1}>{locationText}</Text>
        </View>

        {/* Specs and Price Row */}
        <View style={styles.footerRow}>
          <View style={styles.specsContainer}>
            <View style={styles.specItem}>
              <Ionicons name="bed-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.specText}>{property.chambres || 2} ch.</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="expand-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.specText}>{property.surface || 65} m²</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>{formattedPrice}</Text>
            <Text style={styles.priceUnit}>/mois</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#f8fafc',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeCoupDeCoeur: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeCoupDeCoeurText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    fontSize: 13,
    color: '#64748b',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  specsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    marginRight: 6,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 'auto',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  priceUnit: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '500',
  },
});
