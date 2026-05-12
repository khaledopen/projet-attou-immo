import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

const AddProperty = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  });

  const handleSubmit = async () => {
    // Basic validation
    if (!form.titre || !form.prix || !form.rue || !form.ville) {
      Alert.alert('Champs requis', 'Veuillez remplir les informations essentielles.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = {
        ...form,
        prix: parseFloat(form.prix),
        surface: parseFloat(form.surface),
        nombrePieces: parseInt(form.nombrePieces),
        nombreChambres: parseInt(form.nombreChambres),
        etage: form.etage ? parseInt(form.etage) : null,
        equipements: ["Wifi", "Climatisation"], // Mock for now, could be dynamic
      };

      await axios.post(`${BASE_URL}/properties`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Succès', 'Votre annonce a été publiée avec succès !', [
        { text: 'Super', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error('Erreur publication:', error);
      Alert.alert('Erreur', 'Impossible de publier l\'annonce.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Nouvelle Annonce</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Informations de l'annonce</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Titre (ex: Appartement F4 Cocody)"
          value={form.titre}
          onChangeText={(v) => setForm({...form, titre: v})}
        />
        <TextInput 
          style={[styles.input, { height: 100 }]} 
          placeholder="Description détaillée..."
          multiline
          value={form.description}
          onChangeText={(v) => setForm({...form, description: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Prix (FCFA / mois)"
          keyboardType="numeric"
          value={form.prix}
          onChangeText={(v) => setForm({...form, prix: v})}
        />

        <Text style={styles.sectionTitle}>Caractéristiques du Bien</Text>
        <View style={styles.row}>
          <TextInput 
            style={[styles.input, { flex: 1, marginRight: 10 }]} 
            placeholder="Surface (m²)"
            keyboardType="numeric"
            value={form.surface}
            onChangeText={(v) => setForm({...form, surface: v})}
          />
          <TextInput 
            style={[styles.input, { flex: 1 }]} 
            placeholder="Nb Pièces"
            keyboardType="numeric"
            value={form.nombrePieces}
            onChangeText={(v) => setForm({...form, nombrePieces: v})}
          />
        </View>
        <View style={styles.row}>
          <TextInput 
            style={[styles.input, { flex: 1, marginRight: 10 }]} 
            placeholder="Chambres"
            keyboardType="numeric"
            value={form.nombreChambres}
            onChangeText={(v) => setForm({...form, nombreChambres: v})}
          />
          <TextInput 
            style={[styles.input, { flex: 1 }]} 
            placeholder="Étage"
            keyboardType="numeric"
            value={form.etage}
            onChangeText={(v) => setForm({...form, etage: v})}
          />
        </View>

        <Text style={styles.sectionTitle}>Localisation</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ville (ex: Abidjan)"
          value={form.ville}
          onChangeText={(v) => setForm({...form, ville: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Rue / Quartier"
          value={form.rue}
          onChangeText={(v) => setForm({...form, rue: v})}
        />
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  appBarTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  scrollContent: { padding: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e3a8a', marginBottom: 15, marginTop: 10 },
  input: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 15, borderWide: 1, borderColor: '#f1f5f9', marginBottom: 15, fontSize: 14 },
  row: { flexDirection: 'row' },
  footer: { padding: 25, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  submitButton: { backgroundColor: '#1e3a8a', padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#1e3a8a', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AddProperty;
