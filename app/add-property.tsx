import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, Image, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
// import { BASE_URL } from '../api/config'; // removed, api instance handles base URL
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const AddProperty = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    prix: '',
    typeBien: 'APPARTEMENT',
    surface: '',
    nombrePieces: '',
    nombreChambres: '',
    etage: '',
    rue: '',
    ville: 'Abidjan',
    codePostal: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchAddress = async (query: string) => {
    setForm(prev => ({ ...prev, rue: query }));

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearchingAddress(true);
      const encodedQuery = encodeURIComponent(query + ', Abidjan');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=5&countrycodes=ci`,
        {
          headers: {
            'User-Agent': 'AttouHome/1.0',
          },
        }
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (e) {
      console.warn('Autocomplete search error:', e);
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSelectAddress = (item: any) => {
    const mainAddress = item.address.road || item.address.suburb || item.address.neighbourhood || item.display_name.split(',')[0];
    const city = item.address.city || item.address.town || item.address.village || 'Abidjan';
    
    setForm(prev => ({
      ...prev,
      rue: mainAddress,
      ville: city,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
    
    setShowSuggestions(false);
  };

  const availableEquipments = [
    { id: 'Climatisation', label: '❄️ Climatisation' },
    { id: 'Eau chaude', label: '🔥 Eau chaude' },
    { id: 'Internet', label: '🌐 Internet' },
    { id: 'Groupe électrogène', label: '⚡ Groupe électrogène' },
    { id: 'Piscine', label: '🏊 Piscine' },
    { id: 'Gardiennage', label: '🛡️ Gardiennage' },
    { id: 'Parking', label: '🚗 Parking' },
  ];

  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);

  const toggleEquipment = (id: string) => {
    if (selectedEquipments.includes(id)) {
      setSelectedEquipments(selectedEquipments.filter(e => e !== id));
    } else {
      setSelectedEquipments([...selectedEquipments, id]);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Accès à la galerie requis pour ajouter des photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.3,
    });
    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setImages([...images, ...uris]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Accès à l\'appareil photo requis.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.3,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImages = async (imageUris: string[], token: string) => {
    const uploadedUrls: string[] = [];
    const retries = 3;
    const delayMs = 1500;

    for (let index = 0; index < imageUris.length; index++) {
      const uri = imageUris[index];
      const formData = new FormData();
      const filename = uri.split('/').pop() || `photo_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('file', {
        uri: uri,
        name: filename,
        type,
      } as any);

      let success = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`[Upload] Image ${index + 1}/${imageUris.length} - Tentative ${attempt}/${retries}`);
          const res = await api.post('/upload', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });
          uploadedUrls.push(res.data.url);
          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[Upload] Échec tentative ${attempt}/${retries} pour l'image ${index + 1}:`, err.message);
          
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      if (!success) {
        throw new Error(
          `Impossible de charger l'image ${index + 1}. Une erreur réseau temporaire (502 Bad Gateway ou Timeout) s'est produite avec le tunnel de développement. Veuillez réessayer dans quelques instants. Détail: ${lastError?.message || lastError}`
        );
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!form.titre || !form.prix || !form.rue || !form.ville) {
      Alert.alert('Champs requis', 'Veuillez remplir les informations essentielles.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Champs requis', 'Veuillez ajouter au moins une photo pour votre annonce.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        uploadedUrls = await uploadImages(images, token!);
      }

      const payload = {
        ...form,
        prix: parseFloat(form.prix),
        surface: parseFloat(form.surface) || 0,
        nombrePieces: parseInt(form.nombrePieces) || 0,
        nombreChambres: parseInt(form.nombreChambres) || 0,
        etage: form.etage ? parseInt(form.etage) : null,
        equipements: selectedEquipments,
        photos: uploadedUrls,
      };

      await api.post('/properties', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Succès', 'Votre annonce a été publiée avec succès !', [
        { text: 'Super', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('Erreur publication:', error);
      const msg = error.response?.data?.message || error.message || 'Erreur lors de la publication';
      Alert.alert('Erreur', `Impossible de publier l'annonce. ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const propertyTypes = ['APPARTEMENT', 'MAISON', 'STUDIO', 'VILLA', 'CHAMBRE'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Nouvelle Annonce</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos du bien</Text>
            <View style={styles.imageSelectorRow}>
              <TouchableOpacity style={styles.imageSelectorButton} onPress={pickImage}>
                <Ionicons name="images-outline" size={20} color="#0284c7" />
                <Text style={styles.imageSelectorText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageSelectorButton} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={20} color="#0284c7" />
                <Text style={styles.imageSelectorText}>Prendre</Text>
              </TouchableOpacity>
            </View>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.previewImageContainer}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informations principales</Text>
            <TextInput
              style={styles.input}
              placeholder="Titre (ex: Appartement F4 Cocody)"
              placeholderTextColor="#94a3b8"
              value={form.titre}
              onChangeText={(v) => setForm({ ...form, titre: v })}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description détaillée de votre bien..."
              placeholderTextColor="#94a3b8"
              multiline
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Prix (FCFA / mois)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={form.prix}
              onChangeText={(v) => setForm({ ...form, prix: v })}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Type de bien</Text>
            <View style={styles.typeSelector}>
              {propertyTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, form.typeBien === type && styles.typeButtonActive]}
                  onPress={() => setForm({ ...form, typeBien: type })}
                >
                  <Text style={[styles.typeButtonText, form.typeBien === type && styles.typeButtonTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Caractéristiques</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Surface (m²)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={form.surface}
                onChangeText={(v) => setForm({ ...form, surface: v })}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nb Pièces"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={form.nombrePieces}
                onChangeText={(v) => setForm({ ...form, nombrePieces: v })}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Chambres"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={form.nombreChambres}
                onChangeText={(v) => setForm({ ...form, nombreChambres: v })}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Étage"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={form.etage}
                onChangeText={(v) => setForm({ ...form, etage: v })}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Équipements inclus</Text>
            <View style={styles.equipmentGrid}>
              {availableEquipments.map((eq) => {
                const isSelected = selectedEquipments.includes(eq.id);
                return (
                  <TouchableOpacity
                    key={eq.id}
                    style={[styles.equipmentItem, isSelected && styles.equipmentItemActive]}
                    onPress={() => toggleEquipment(eq.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={isSelected ? "checkbox" : "square-outline"} 
                      size={20} 
                      color={isSelected ? "#fff" : "#64748b"} 
                    />
                    <Text style={[styles.equipmentLabel, isSelected && styles.equipmentLabelActive]}>
                      {eq.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            
            <Text style={styles.fieldLabel}>Ville</Text>
            <TextInput
              style={styles.input}
              placeholder="Ville (ex: Abidjan)"
              placeholderTextColor="#94a3b8"
              value={form.ville}
              onChangeText={(v) => setForm({ ...form, ville: v })}
            />
            
            <Text style={styles.fieldLabel}>Rue / Quartier (Recherche et Autocomplétion)</Text>
            <View style={{ position: 'relative', zIndex: 999 }}>
              <TextInput
                style={styles.input}
                placeholder="Commencez à saisir la rue ou le quartier..."
                placeholderTextColor="#94a3b8"
                value={form.rue}
                onChangeText={searchAddress}
              />
              {searchingAddress && (
                <ActivityIndicator 
                  size="small" 
                  color="#0284c7" 
                  style={{ position: 'absolute', right: 15, top: 18 }} 
                />
              )}
              
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.suggestionItem,
                        idx === suggestions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => handleSelectAddress(item)}
                    >
                      <Ionicons name="location-outline" size={16} color="#0284c7" style={{ marginRight: 8 }} />
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {form.latitude && form.longitude && (
              <View style={styles.coordsBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                <Text style={styles.coordsText}>
                  Coordonnées GPS enregistrées : {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Publier l'annonce</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0f2fe' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  closeButton: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  appBarTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  scrollContent: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#0ea5e9', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0284c7', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 15, fontSize: 16, color: '#0f172a' },
  inputMultiline: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
  typeButtonActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  typeButtonText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  typeButtonTextActive: { color: '#fff' },
  imageSelectorRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  imageSelectorButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: '#f0f9ff', borderWidth: 1.5, borderColor: '#bae6fd' },
  imageSelectorText: { fontSize: 14, fontWeight: '700', color: '#0284c7' },
  imagePreviewScroll: { flexDirection: 'row', marginTop: 10 },
  previewImageContainer: { position: 'relative', marginRight: 12 },
  previewImage: { width: 90, height: 90, borderRadius: 16 },
  removeImageButton: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 11 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  submitButton: { backgroundColor: '#0284c7', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#0284c7', shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  equipmentItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', minWidth: '47%' },
  equipmentItemActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  equipmentLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  equipmentLabelActive: { color: '#fff' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 9999,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  coordsText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
});

export default AddProperty;
