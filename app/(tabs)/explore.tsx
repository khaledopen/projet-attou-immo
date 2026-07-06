import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import api from '../../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Centrage par défaut sur Abidjan, Côte d'Ivoire
const ABIDJAN_LAT = 5.3484;
const ABIDJAN_LNG = -3.9733;
import MapView, { Marker, Polyline } from '../../components/MapComponents';

export default function ExploreMapScreen() {
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [properties, setProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  // États pour le tracé d'itinéraire
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);

  // Valeurs pour la simulation Web
  const [webCenterLat, setWebCenterLat] = useState(ABIDJAN_LAT);
  const [webCenterLng, setWebCenterLng] = useState(ABIDJAN_LNG);
  const [webZoom, setWebZoom] = useState(45000); // pixels par degré

  // Référence pour la carte mobile
  const mapRef = useRef<any>(null);

  // Déterminer la coordonnée géographique en fonction de la commune (Treichville, Cocody, Bingerville, etc.)
  const getCommuneCoordinates = (rue: string, index: number) => {
    const normalized = (rue || '').toLowerCase().trim();
    
    // Coordonnées par défaut (Riviera 3)
    let lat = ABIDJAN_LAT;
    let lng = ABIDJAN_LNG;
    
    if (normalized.includes('treichville')) {
      lat = 5.3015;
      lng = -4.0145;
    } else if (normalized.includes('bingerville')) {
      lat = 5.3600;
      lng = -3.8900;
    } else if (normalized.includes('cocody') || normalized.includes('angre') || normalized.includes('angré') || normalized.includes('riviera') || normalized.includes('rivera') || normalized.includes('plateaux') || normalized.includes('faya') || normalized.includes('palmeraie') || normalized.includes('golf')) {
      lat = 5.3600;
      lng = -3.9733;
    } else if (normalized.includes('marcory') || normalized.includes('zone 4')) {
      lat = 5.3050;
      lng = -3.9850;
    } else if (normalized.includes('yopougon') || normalized.includes('yop') || normalized.includes('sideci') || normalized.includes('académie')) {
      lat = 5.3450;
      lng = -4.0750;
    } else if (normalized.includes('adjamé') || normalized.includes('adjame')) {
      lat = 5.3530;
      lng = -4.0200;
    } else if (normalized.includes('abobo')) {
      lat = 5.4160;
      lng = -4.0160;
    } else if (normalized.includes('koumassi')) {
      lat = 5.2950;
      lng = -3.9620;
    } else if (normalized.includes('anyama')) {
      lat = 5.4950;
      lng = -4.0520;
    } else if (normalized.includes('songon')) {
      lat = 5.3200;
      lng = -4.2150;
    } else if (normalized.includes('plateau')) {
      lat = 5.3256;
      lng = -4.0194;
    }

    // Décalage léger et déterministe pour que les biens d'une même commune ne se chevauchent pas
    const angle = (index * 2 * Math.PI) / 8;
    const jitterRadius = 0.005; // environ 500m
    return {
      latitude: lat + jitterRadius * Math.sin(angle),
      longitude: lng + jitterRadius * Math.cos(angle),
    };
  };

  // Charger les données de l'API
  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties?statut=PUBLIEE');
      // S'assurer que tous les biens ont des coordonnées valides
      const mappedData = response.data.map((item: any, index: number) => {
        let lat = item.bien?.adresse?.latitude;
        let lng = item.bien?.adresse?.longitude;
        
        // Si les coordonnées de la base sont nulles ou par défaut,
        // on géolocalise par commune (rue).
        const isDefaultCenter = lat === ABIDJAN_LAT && lng === ABIDJAN_LNG;
        if (!lat || !lng || isDefaultCenter) {
          const coords = getCommuneCoordinates(item.bien?.adresse?.rue || item.titre, index);
          lat = coords.latitude;
          lng = coords.longitude;
        }
        return {
          ...item,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        };
      });
      setProperties(mappedData);
    } catch (error) {
      console.error('Erreur chargement carte properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Demande de permission géolocalisation
  const requestLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
        
        // Vérifier si l'utilisateur est proche de la zone d'Abidjan
        const isNearAbidjan = 
          location.coords.latitude >= 5.0 && 
          location.coords.latitude <= 5.6 && 
          location.coords.longitude >= -4.3 && 
          location.coords.longitude <= -3.5;

        if (Platform.OS !== 'web' && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }, 1000);
        } else {
          if (isNearAbidjan) {
            setWebCenterLat(location.coords.latitude);
            setWebCenterLng(location.coords.longitude);
          } else {
            setWebCenterLat(ABIDJAN_LAT);
            setWebCenterLng(ABIDJAN_LNG);
          }
        }
      }
    } catch (e) {
      console.log('Location permission error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
      requestLocation();
    }, [])
  );

  // Calcul de distance à vol d'oiseau (formule de Haversine)
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Rayon de la terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Retourne la distance en km
  };

  // Calcul d'itinéraire routier via l'API OSRM
  const fetchRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      setLoadingRoute(true);
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoords(coords);

        // Formater la distance
        const distanceM = route.distance; // en mètres
        let distanceStr = '';
        if (distanceM >= 1000) {
          distanceStr = `${(distanceM / 1000).toFixed(1)} km`;
        } else {
          distanceStr = `${Math.round(distanceM)} m`;
        }

        // Formater la durée
        const durationS = route.duration; // en secondes
        let durationStr = '';
        if (durationS >= 60) {
          durationStr = `${Math.round(durationS / 60)} min`;
        } else {
          durationStr = `${Math.round(durationS)} s`;
        }

        setRouteDistance(`${distanceStr} (${durationStr})`);
      } else {
        // Fallback ligne droite si aucun itinéraire
        setRouteCoords([
          { latitude: startLat, longitude: startLng },
          { latitude: endLat, longitude: endLng },
        ]);
        const distKm = getHaversineDistance(startLat, startLng, endLat, endLng);
        const distStr = distKm >= 1 ? `${distKm.toFixed(1)} km (direct)` : `${Math.round(distKm * 1000)} m (direct)`;
        setRouteDistance(distStr);
      }
    } catch (error) {
      console.warn('Erreur OSRM routage, utilisation d\'un tracé direct:', error);
      setRouteCoords([
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng },
      ]);
      const distKm = getHaversineDistance(startLat, startLng, endLat, endLng);
      const distStr = distKm >= 1 ? `${distKm.toFixed(1)} km (direct)` : `${Math.round(distKm * 1000)} m (direct)`;
      setRouteDistance(distStr);
    } finally {
      setLoadingRoute(false);
    }
  };

  // Déclencher le calcul d'itinéraire au changement de sélection du bien ou de position de l'utilisateur
  useEffect(() => {
    if (selectedProperty && userLocation) {
      fetchRoute(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        selectedProperty.latitude,
        selectedProperty.longitude
      );
    } else {
      setRouteCoords([]);
      setRouteDistance(null);
    }
  }, [selectedProperty, userLocation]);

  // Zoomer et sélectionner automatiquement le bien s'il y a un paramètre 'focus' dans l'URL
  useEffect(() => {
    if (focus && properties.length > 0) {
      const propToFocus = properties.find((p) => String(p.id) === String(focus));
      if (propToFocus) {
        setSelectedProperty(propToFocus);
        if (Platform.OS !== 'web' && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: propToFocus.latitude,
            longitude: propToFocus.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }, 1000);
        } else {
          setWebCenterLat(propToFocus.latitude);
          setWebCenterLng(propToFocus.longitude);
          setWebZoom(70000); // Zoom plus proche pour voir le bien précisément
        }
      }
    }
  }, [focus, properties]);

  // Filtrer les propriétés selon la catégorie
  useEffect(() => {
    if (selectedCategory === 'Tous') {
      setFilteredProperties(properties);
    } else {
      setFilteredProperties(
        properties.filter(
          (p) => p.typeBien?.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
        )
      );
    }
    // Dé-sélectionner le bien courant s'il ne correspond plus au filtre
    if (selectedProperty) {
      const stillVisible = properties.some(
        (p) =>
          p.id === selectedProperty.id &&
          (selectedCategory === 'Tous' || p.typeBien === selectedCategory)
      );
      if (!stillVisible) setSelectedProperty(null);
    }
  }, [properties, selectedCategory]);

  const formatPrice = (price: number) => {
    if (!price) return '0';
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1).replace('.0', '')}M`;
    }
    if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}k`;
    }
    return `${price}`;
  };

  // Recentre la carte sur Abidjan
  const handleRecenter = () => {
    if (Platform.OS !== 'web' && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: ABIDJAN_LAT,
        longitude: ABIDJAN_LNG,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } else {
      setWebCenterLat(ABIDJAN_LAT);
      setWebCenterLng(ABIDJAN_LNG);
      setWebZoom(45000);
    }
  };

  // Dessine un quartier d'Abidjan dynamique qui se déplace et zoome sur Web
  const renderWebZone = (name: string, lat: number, lng: number, bgColor: string, width: number, height: number) => {
    const mapWidth = Dimensions.get('window').width;
    const mapHeight = Dimensions.get('window').height - 130;

    const x = (lng - webCenterLng) * webZoom + mapWidth / 2;
    const y = (webCenterLat - lat) * webZoom + mapHeight / 2;

    const left = x - width / 2;
    const top = y - height / 2;

    if (left < -width || left > mapWidth + width || top < -height || top > mapHeight + height) {
      return null;
    }

    return (
      <View
        style={[
          styles.webDynamicZone,
          {
            left,
            top,
            width,
            height,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Text style={styles.webZoneLabel}>{name}</Text>
      </View>
    );
  };

  // ─── RENDU DU SIMULATEUR DE CARTE (WEB ONLY) ───
  const renderWebMap = () => {
    const mapWidth = Dimensions.get('window').width;
    const mapHeight = Dimensions.get('window').height - 130;

    // Gestion du glissement (Pan) sur Web
    const handleWebPan = (direction: 'up' | 'down' | 'left' | 'right') => {
      const step = 200 / webZoom; // taille du pas par rapport au zoom
      if (direction === 'up') setWebCenterLat((prev) => prev + step);
      if (direction === 'down') setWebCenterLat((prev) => prev - step);
      if (direction === 'left') setWebCenterLng((prev) => prev - step);
      if (direction === 'right') setWebCenterLng((prev) => prev + step);
    };

    const handleWebZoom = (type: 'in' | 'out') => {
      setWebZoom((prev) => (type === 'in' ? prev * 1.3 : prev / 1.3));
    };

    return (
      <View style={[styles.webMapContainer, { height: mapHeight }]}>
        {/* Grillage style carte vectorielle */}
        <View style={styles.webGridBackground} />

        {/* Zones d'Abidjan dynamiques stylisées */}
        {renderWebZone('COCODY', 5.3600, -3.9733, '#86efac', 200, 140)}
        {renderWebZone('PLATEAU', 5.3256, -4.0194, '#cbd5e1', 140, 110)}
        {renderWebZone('MARCORY', 5.3050, -3.9850, '#fef08a', 160, 120)}
        {renderWebZone('YOPOUGON', 5.3450, -4.0750, '#93c5fd', 200, 150)}
        {renderWebZone('ABOBO', 5.4160, -4.0160, '#fca5a5', 180, 130)}
        {renderWebZone('BINGERVILLE', 5.3600, -3.8900, '#fed7aa', 170, 120)}
        {renderWebZone('ADJAMÉ', 5.3530, -4.0200, '#ddd6fe', 130, 100)}
        {renderWebZone('TREICHVILLE', 5.3015, -4.0145, '#fbcfe8', 120, 95)}
        {renderWebZone('Lagune Ébrié 🌊', 5.3150, -4.0000, '#38bdf8', 350, 45)}

        {/* Rendu des épingles de prix interactives sur la carte web */}
        {filteredProperties.map((p) => {
          // Calculer les positions X et Y relatives
          const x = (p.longitude - webCenterLng) * webZoom + mapWidth / 2;
          const y = (webCenterLat - p.latitude) * webZoom + mapHeight / 2;

          // Cacher les marqueurs hors de l'écran
          if (x < -50 || x > mapWidth + 50 || y < -50 || y > mapHeight + 50) {
            return null;
          }

          const isSelected = selectedProperty?.id === p.id;

          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.webMarker,
                { left: x - 45, top: y - 20 },
                isSelected && styles.webMarkerSelected,
              ]}
              onPress={() => setSelectedProperty(p)}
              activeOpacity={0.9}
            >
              <View style={styles.markerContent}>
                <Ionicons name="home" size={11} color="#ffffff" style={styles.markerIcon} />
                <Text style={[styles.webMarkerText, isSelected && styles.webMarkerTextSelected]}>
                  {formatPrice(p.prix)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Trait d'itinéraire routier (SVG) sur le simulateur Web */}
        {Platform.OS === 'web' && routeCoords.length > 0 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: mapWidth,
              height: mapHeight,
              pointerEvents: 'none',
              zIndex: 2,
            } as any}
          >
            <polyline
              points={routeCoords
                .map((pt) => {
                  const x = (pt.longitude - webCenterLng) * webZoom + mapWidth / 2;
                  const y = (webCenterLat - pt.latitude) * webZoom + mapHeight / 2;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Position de l'utilisateur (si activée) */}
        {userLocation && (
          <View
            style={[
              styles.userDot,
              {
                left: (userLocation.coords.longitude - webCenterLng) * webZoom + mapWidth / 2 - 10,
                top: (webCenterLat - userLocation.coords.latitude) * webZoom + mapHeight / 2 - 10,
              },
            ]}
          />
        )}

        {/* Contrôles flottants de la carte Web */}
        <View style={styles.webControls}>
          <TouchableOpacity style={styles.webControlBtn} onPress={() => handleWebZoom('in')}>
            <Ionicons name="add" size={24} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.webControlBtn} onPress={() => handleWebZoom('out')}>
            <Ionicons name="remove" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Croix directionnelle de navigation Web */}
        <View style={styles.webDirectionalPad}>
          <TouchableOpacity style={styles.padBtn} onPress={() => handleWebPan('up')}>
            <Ionicons name="chevron-up" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.padRow}>
            <TouchableOpacity style={styles.padBtn} onPress={() => handleWebPan('left')}>
              <Ionicons name="chevron-back" size={20} color="#0f172a" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.padBtn} onPress={() => handleWebPan('right')}>
              <Ionicons name="chevron-forward" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.padBtn} onPress={() => handleWebPan('down')}>
            <Ionicons name="chevron-down" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── RENDU DU COMPOSANT NATIVE (MOBILE ONLY) ───
  const renderNativeMap = () => {
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: ABIDJAN_LAT,
          longitude: ABIDJAN_LNG,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {filteredProperties.map((p) => {
          const isSelected = selectedProperty?.id === p.id;
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              onPress={() => setSelectedProperty(p)}
            >
              <View style={[styles.nativeMarker, isSelected && styles.nativeMarkerSelected]}>
                <View style={styles.markerContent}>
                  <Ionicons name="home" size={11} color="#ffffff" style={styles.markerIcon} />
                  <Text style={[styles.nativeMarkerText, isSelected && styles.nativeMarkerTextSelected]}>
                    {formatPrice(p.prix)}
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}

        {/* Trait d'itinéraire (Polyline native) sur mobile */}
        {Polyline && routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#0ea5e9"
            strokeWidth={4}
          />
        )}
      </MapView>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Génération de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de filtre de catégorie */}
      <View style={styles.filterHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
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
      </View>

      {/* Rendu principal de la carte */}
      {Platform.OS === 'web' || !MapView ? renderWebMap() : renderNativeMap()}

      {/* Bouton recentrer flottant */}
      <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} activeOpacity={0.8}>
        <Ionicons name="locate" size={24} color="#0284c7" />
      </TouchableOpacity>

      {/* Fiche d'aperçu dynamique du logement sélectionné */}
      {selectedProperty && (
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setSelectedProperty(null)}
          >
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.previewCard}>
            <Image
              source={
                selectedProperty.photos && selectedProperty.photos.length > 0
                  ? { uri: selectedProperty.photos[0].url }
                  : require('../../assets/images/logo.jpg')
              }
              style={styles.previewImage}
            />
            <View style={styles.previewInfo}>
              <View style={styles.badgeRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{selectedProperty.typeBien}</Text>
                </View>
                {loadingRoute ? (
                  <View style={[styles.routeBadge, { backgroundColor: '#f1f5f9' }]}>
                    <ActivityIndicator size="small" color="#64748b" style={{ marginRight: 4, transform: [{ scale: 0.7 }] }} />
                    <Text style={[styles.routeBadgeText, { color: '#64748b' }]}>Calcul...</Text>
                  </View>
                ) : routeDistance ? (
                  <View style={styles.routeBadge}>
                    <Ionicons name="car" size={12} color="#16a34a" style={{ marginRight: 4 }} />
                    <Text style={styles.routeBadgeText}>{routeDistance}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedProperty.titre}
              </Text>
              <Text style={styles.previewAddress} numberOfLines={1}>
                📍 {selectedProperty.bien?.adresse?.ville || 'Abidjan'}, {selectedProperty.bien?.adresse?.rue || ''}
              </Text>
              <Text style={styles.previewPrice}>
                {selectedProperty.prix?.toLocaleString()} FCFA <Text style={styles.monthText}>/mois</Text>
              </Text>
              <View style={styles.previewSpecs}>
                <Text style={styles.specText}>📏 {selectedProperty.surface || 0} m²</Text>
                <Text style={styles.specText}>🛏️ {selectedProperty.bien?.nombreChambres || 0} ch.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.previewActionBtn}
              onPress={() => router.push(`/property/${selectedProperty.id}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  filterHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: 10,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  categoryText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryTextActive: {
    color: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 240,
    right: 20,
    backgroundColor: '#ffffff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 9,
  },
  nativeMarker: {
    backgroundColor: '#0284c7',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeMarkerSelected: {
    backgroundColor: '#0ea5e9',
    transform: [{ scale: 1.15 }],
  },
  nativeMarkerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nativeMarkerTextSelected: {
    color: '#ffffff',
  },

  // ─── STYLES WEB MAP SIMULATOR ───
  webMapContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#cbd5e1',
    overflow: 'hidden',
    marginTop: 100,
  },
  webGridBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e2e8f0',
    opacity: 0.5,
  },
  webDynamicZone: {
    position: 'absolute',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.35,
    zIndex: 1,
  },
  webZoneLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  webMarker: {
    position: 'absolute',
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  webMarkerSelected: {
    backgroundColor: '#ef4444',
    zIndex: 99,
  },
  webMarkerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  webMarkerTextSelected: {
    color: '#ffffff',
  },
  userDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  webControls: {
    position: 'absolute',
    right: 20,
    top: 20,
    gap: 8,
  },
  webControlBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  webDirectionalPad: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  padRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  padBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 17,
  },

  // ─── STYLES FICHE D'APERÇU ───
  previewContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  closePreview: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#ffffff',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  routeBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeBadgeText: {
    color: '#16a34a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginTop: 4,
  },
  monthText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'normal',
  },
  previewSpecs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  specText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  previewActionBtn: {
    backgroundColor: '#0284c7',
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  markerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    marginRight: 4,
  },
});
