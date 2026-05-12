import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../api/config';

const RegisterScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    raisonSociale: '',
    typeBailleur: 'PARTICULIER',
  });

  const handleRegister = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.motDePasse) {
      Alert.alert('Champs requis', 'Veuillez remplir les informations obligatoires.');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/auth/register`, { ...form, role: 'PROPRIETAIRE' });
      Alert.alert('Compte Pro Créé ! 💼', 'Bienvenue chez AttouHome Pro. Connectez-vous.', [{ text: 'Se connecter', onPress: () => router.replace('/login') }]);
    } catch (error) {
      Alert.alert('Erreur', 'L\'inscription a échoué.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Devenir Partenaire 💼</Text>
          <Text style={styles.subtitle}>Créez votre compte professionnel AttouHome Pro.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Informations Personnelles</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Prénom" placeholderTextColor="#64748b" value={form.prenom} onChangeText={(v) => setForm({...form, prenom: v})} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Nom" placeholderTextColor="#64748b" value={form.nom} onChangeText={(v) => setForm({...form, nom: v})} />
          </View>
          <TextInput style={styles.input} placeholder="Email Pro" placeholderTextColor="#64748b" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm({...form, email: v})} />
          <TextInput style={styles.input} placeholder="Téléphone" placeholderTextColor="#64748b" keyboardType="phone-pad" value={form.telephone} onChangeText={(v) => setForm({...form, telephone: v})} />

          <Text style={styles.sectionLabel}>Informations Professionnelles</Text>
          <TextInput style={styles.input} placeholder="Agence / Raison sociale" placeholderTextColor="#64748b" value={form.raisonSociale} onChangeText={(v) => setForm({...form, raisonSociale: v})} />
          
          <View style={styles.typeSelector}>
            {['PARTICULIER', 'AGENCE', 'PROMOTEUR'].map((type) => (
              <TouchableOpacity key={type} style={[styles.typeButton, form.typeBailleur === type && styles.typeButtonActive]} onPress={() => setForm({...form, typeBailleur: type})}>
                <Text style={[styles.typeButtonText, form.typeBailleur === type && styles.typeButtonTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#64748b" secureTextEntry value={form.motDePasse} onChangeText={(v) => setForm({...form, motDePasse: v})} />

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Créer mon compte Pro</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 30, paddingTop: 60 },
  backButton: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '900', color: '#1e3a8a' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 8 },
  form: { width: '100%' },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#1e3a8a', marginBottom: 15, marginTop: 15, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 15, borderWidth: 1.5, borderColor: '#f1f5f9', marginBottom: 15, fontSize: 16, color: '#1e293b' },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', borderWidth: 1.5, borderColor: '#f1f5f9' },
  typeButtonActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  typeButtonText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  typeButtonTextActive: { color: '#fff' },
  registerButton: { backgroundColor: '#1e3a8a', paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 25, shadowColor: '#1e3a8a', shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' }
});

export default RegisterScreen;
