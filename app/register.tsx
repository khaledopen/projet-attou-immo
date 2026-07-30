import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL, GOOGLE_CALLBACK_URL } from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// ✅ Client ID Web depuis Google Cloud Console
const GOOGLE_CLIENT_ID_WEB = '57003195747-e1denhbqp169eucbkjjsoq2jvmqruhlk.apps.googleusercontent.com';

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

  // ─── Google OAuth : flux manuel via WebBrowser ───
  const handleGoogleToken = async (accessToken: string) => {
    try {
      console.log('[Google Pro] Fetching profile with token…');
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googleProfile = await userInfoRes.json();
      console.log('[Google Pro] Profile:', JSON.stringify(googleProfile, null, 2));

      if (!googleProfile.email) throw new Error('Email non retourné par Google.');

      const { email: googleEmail, given_name, family_name } = googleProfile;
      const googlePassword = `GoogleAuthSecurePass123!_${googleEmail}`;

      try {
        console.log('[Google Pro] Attempting login for existing Google user:', googleEmail);
        const loginRes = await api.post('/auth/login', {
          email: googleEmail,
          password: googlePassword,
        });
        const { token, user } = loginRes.data;

        // Restriction de rôle pour l'application Propriétaire
        if (user.role !== 'PROPRIETAIRE' && user.role !== 'ADMIN') {
          Alert.alert('Accès refusé', 'Ce compte est configuré comme locataire. Veuillez utiliser un compte partenaire.');
          return;
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        Alert.alert('Connexion Google réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
        router.replace('/(tabs)');
      } catch (loginError: any) {
        console.log('[Google Pro] Login failed, attempting registration...', loginError?.response?.data || loginError?.message);
        
        try {
          // Nouveau compte → inscription automatique en tant que Propriétaire
          const regRes = await api.post('/auth/register', {
            email: googleEmail,
            motDePasse: googlePassword,
            password: googlePassword,
            nom: family_name || googleProfile.name || 'Nom',
            prenom: given_name || 'Prénom',
            telephone: googleProfile.phone || null,
            role: 'PROPRIETAIRE',
            raisonSociale: null,
            typeBailleur: 'PARTICULIER',
          });
          console.log('[Google Pro] Registration success:', JSON.stringify(regRes.data));

          const loginRes = await api.post('/auth/login', {
            email: googleEmail,
            password: googlePassword,
          });
          const { token, user } = loginRes.data;
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userData', JSON.stringify(user));
          Alert.alert('Inscription Google réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
          router.replace('/(tabs)');
        } catch (regErr: any) {
          console.log('[Google Pro] Register failed:', regErr?.response?.data || regErr?.message);
          const errMsg = regErr.response?.data?.message || regErr.message || '';
          if (errMsg.includes('déjà utilisé') || errMsg.includes('déjà existant') || errMsg.includes('already used')) {
            Alert.alert(
              'Compte existant ⚠️',
              'Cette adresse e-mail est déjà associée à un compte classique. Veuillez vous connecter avec votre mot de passe habituel.'
            );
          } else {
            Alert.alert('Erreur Inscription', `Impossible de créer le compte : ${errMsg}`);
          }
        }
      }
    } catch (error: any) {
      console.error('[Google Pro] Google token error:', error);
      Alert.alert('Erreur Synchro Google', error.message || 'Impossible de synchroniser le compte Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.motDePasse) {
      Alert.alert('Champs requis', 'Veuillez remplir les informations obligatoires.');
      return;
    }
    try {
      setLoading(true);
      // 1. Créer le compte propriétaire
      await api.post('/auth/register', { ...form, role: 'PROPRIETAIRE' });
      // 2. Connexion automatique immédiate après inscription
      const loginRes = await api.post('/auth/login', {
        email: form.email,
        password: form.motDePasse,
      });
      const { token, refreshToken, user } = loginRes.data;
      // 3. Sauvegarder le token et les données utilisateur
      await AsyncStorage.setItem('userToken', token);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      // 4. Redirection directe vers l'espace propriétaire
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Register error:', error);
      let msg = 'Problème de connexion au serveur.';
      if (error.response) {
        if (error.response.data && typeof error.response.data === 'object' && error.response.data.message) {
          msg = error.response.data.message;
        } else if (error.response.status === 400) {
          msg = 'Cet email est déjà utilisé pour un compte.';
        } else {
          msg = `Erreur du serveur (code ${error.response.status})`;
        }
      } else if (error.message) {
        msg = error.message;
      }
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);

      const backendCallback = GOOGLE_CALLBACK_URL;
      const appReturnUrl = Linking.createURL('oauth-callback');
      const statePayload = JSON.stringify({ redirect_to: appReturnUrl, role: 'PROPRIETAIRE' });
      const stateB64 = btoa(statePayload);

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID_WEB)}&redirect_uri=${encodeURIComponent(backendCallback)}&response_type=token&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(stateB64)}`;

      console.log('[Google Pro] Opening auth URL:', googleAuthUrl);
      console.log('[Google Pro] Backend callback:', backendCallback);
      console.log('[Google Pro] App return URL:', appReturnUrl);

      const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, appReturnUrl);
      console.log('[Google Pro] Browser result:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.url) {
        const url = Linking.parse(result.url);
        const accessToken = url.queryParams?.access_token as string | undefined;
        console.log('[Google Pro] access_token:', accessToken ? '✓ present' : '✗ missing');

        if (accessToken) {
          await handleGoogleToken(accessToken);
        } else {
          Alert.alert('Erreur', 'Token d\'accès introuvable.');
          setLoading(false);
        }
      } else {
        console.log('[Google Pro] Auth cancelled/dismissed:', result.type);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[Google Pro] Launch error:', err);
      Alert.alert('Erreur', err.message || 'Impossible d\'ouvrir Google.');
      setLoading(false);
    }
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
            <Text style={styles.title}>Devenir Partenaire</Text>
            <Text style={styles.subtitle}>Créez votre compte professionnel AttouHome Pro.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Informations Personnelles</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 10, minWidth: 0 }]} placeholder="Prénom" placeholderTextColor="#64748b" value={form.prenom} onChangeText={(v) => setForm({...form, prenom: v})} />
              <TextInput style={[styles.input, { flex: 1, minWidth: 0 }]} placeholder="Nom" placeholderTextColor="#64748b" value={form.nom} onChangeText={(v) => setForm({...form, nom: v})} />
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

            {/* ✅ Bouton Google pour Propriétaire */}
            <TouchableOpacity
              style={[styles.googleButton, loading && { opacity: 0.6 }]}
              onPress={handleGoogleRegister}
              disabled={loading}
            >
              <Image
                source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                style={{ width: 20, height: 20, marginRight: 10 }}
              />
              <Text style={styles.googleButtonText}>S'inscrire avec Google</Text>
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
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#0ea5e9', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#0284c7', marginBottom: 12, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 15, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 15, fontSize: 16, color: '#0f172a' },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
  typeButtonActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  typeButtonText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  typeButtonTextActive: { color: '#fff' },
  registerButton: { backgroundColor: '#0284c7', paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 15, shadowColor: '#0284c7', shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  googleButton:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 18, borderRadius: 18,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1,
  },
  googleButtonText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
});

export default RegisterScreen;
