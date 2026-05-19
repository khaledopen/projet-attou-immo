import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const RegisterScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    confirmPassword: '',
  });

  const handleRegister = async () => {
    const { nom, prenom, email, motDePasse, confirmPassword } = form;
    if (!nom || !prenom || !email || !motDePasse) {
      Alert.alert('Champs requis', 'Veuillez remplir les informations obligatoires.');
      return;
    }
    if (motDePasse !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/auth/register`, { ...form, role: 'LOCATAIRE' });
      Alert.alert('Félicitations ! 🎉', 'Votre compte AttouHome a été créé.', [{ text: 'Se connecter', onPress: () => router.replace('/login') }]);
    } catch (error) {
      Alert.alert('Erreur', 'L\'inscription a échoué.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0284c7" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez la communauté AttouHome dès aujourd'hui.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 1, marginRight: 10 }]} 
                placeholder="Prénom" 
                placeholderTextColor="#94a3b8"
                value={form.prenom} 
                onChangeText={(v) => setForm({...form, prenom: v})} 
              />
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Nom" 
                placeholderTextColor="#94a3b8"
                value={form.nom} 
                onChangeText={(v) => setForm({...form, nom: v})} 
              />
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="Adresse Email" 
              placeholderTextColor="#94a3b8"
              keyboardType="email-address" 
              autoCapitalize="none" 
              value={form.email} 
              onChangeText={(v) => setForm({...form, email: v})} 
            />
            
            <TextInput 
              style={styles.input} 
              placeholder="Téléphone" 
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad" 
              value={form.telephone} 
              onChangeText={(v) => setForm({...form, telephone: v})} 
            />
            
            <View style={styles.passwordContainer}>
              <TextInput 
                style={styles.passwordInput} 
                placeholder="Mot de passe" 
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword} 
                value={form.motDePasse} 
                onChangeText={(v) => setForm({...form, motDePasse: v})} 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="Confirmer le mot de passe" 
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword} 
              value={form.confirmPassword} 
              onChangeText={(v) => setForm({...form, confirmPassword: v})} 
            />

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>S'inscrire</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0f2fe' },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 16 },
  backButton: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#0ea5e9', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#475569', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#0ea5e9', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  row: { flexDirection: 'row', marginBottom: 5 },
  input: { 
    backgroundColor: '#f8fafc', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    marginBottom: 15, 
    fontSize: 16, 
    color: '#0f172a' 
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 15, 
    borderRadius: 16, 
    marginBottom: 15, 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0' 
  },
  passwordInput: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0f172a' },
  registerButton: { 
    backgroundColor: '#0284c7', 
    paddingVertical: 18, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 15, 
    shadowColor: '#0284c7', 
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, 
    shadowRadius: 15, 
    elevation: 5 
  },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 }
});

export default RegisterScreen;
