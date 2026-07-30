import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const { redirectTo } = useLocalSearchParams();
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

  // ─── Google OAuth : flux manuel via WebBrowser ───
  const handleGoogleToken = async (accessToken: string) => {
    try {
      console.log('[Google] Fetching profile with token…');
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googleProfile = await userInfoRes.json();
      console.log('[Google] Profile:', JSON.stringify(googleProfile, null, 2));

      if (!googleProfile.email) throw new Error('Email non retourné par Google.');

      const { email: googleEmail, given_name, family_name } = googleProfile;
      const googlePassword = `GoogleAuthSecurePass123!_${googleEmail}`;

      try {
        // Compte existant → connexion directe
        const loginRes = await api.post('/auth/login', {
          email: googleEmail,
          password: googlePassword,
        });
        const { token, user } = loginRes.data;
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        Alert.alert('Connexion Google réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
        router.replace('/(tabs)');
      } catch (loginErr: any) {
        console.log('[Google] User not found, registering…');
        // Nouveau compte → inscription automatique
        try {
          const regRes = await api.post('/auth/register', {
            email: googleEmail,
            motDePasse: googlePassword,
            password: googlePassword,
            nom: family_name || googleProfile.name || 'Nom',
            prenom: given_name || 'Prénom',
            telephone: googleProfile.phone || null,
            role: 'LOCATAIRE',
          });
          console.log('[Google] Registered:', JSON.stringify(regRes.data));

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
          console.log('[Google] Register failed:', regErr?.response?.data || regErr?.message);
          const errMsg = regErr.response?.data?.message || regErr.message || '';
          if (errMsg.includes('déjà utilisé') || errMsg.includes('déjà existant') || errMsg.includes('already used')) {
            Alert.alert(
              'Compte existant ⚠️',
              'Cette adresse e-mail est déjà associée à un compte classique. Veuillez vous connecter avec votre mot de passe habituel.'
            );
          } else {
            Alert.alert('Erreur', `Impossible de créer le compte : ${errMsg}`);
          }
        }
      }
    } catch (error: any) {
      console.error('[Google] Error:', error);
      Alert.alert('Erreur Google', error.message || 'Impossible de synchroniser le compte Google.');
    } finally {
      setLoading(false);
    }
  };

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
      // Le backend retourne directement { token, user } à l'inscription
      const { data } = await api.post('/auth/register', { ...form, role: 'LOCATAIRE' });
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      // Redirection directe sans repasser par login
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
      const statePayload = JSON.stringify({ redirect_to: appReturnUrl, role: 'LOCATAIRE' });
      const stateB64 = btoa(statePayload);

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID_WEB)}&redirect_uri=${encodeURIComponent(backendCallback)}&response_type=token&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(stateB64)}`;

      console.log('[Google] Opening auth URL:', googleAuthUrl);
      console.log('[Google] Backend callback:', backendCallback);
      console.log('[Google] App return URL:', appReturnUrl);

      const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, appReturnUrl);
      console.log('[Google] Browser result:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.url) {
        const url = Linking.parse(result.url);
        const accessToken = url.queryParams?.access_token as string | undefined;
        console.log('[Google] access_token:', accessToken ? '✓ present' : '✗ missing');

        if (accessToken) {
          await handleGoogleToken(accessToken);
        } else {
          Alert.alert('Erreur', 'Token d\'accès introuvable dans la réponse Google.');
          setLoading(false);
        }
      } else {
        console.log('[Google] Auth cancelled/dismissed:', result.type);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[Google] Launch error:', err);
      Alert.alert('Erreur', err.message || 'Impossible de lancer l\'authentification Google.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
                style={[styles.input, { flex: 1, marginRight: 10, minWidth: 0 }]}
                placeholder="Prénom"
                placeholderTextColor="#94a3b8"
                value={form.prenom}
                onChangeText={(v) => setForm({ ...form, prenom: v })}
              />
              <TextInput
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                placeholder="Nom"
                placeholderTextColor="#94a3b8"
                value={form.nom}
                onChangeText={(v) => setForm({ ...form, nom: v })}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Adresse Email"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />

            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={form.telephone}
              onChangeText={(v) => setForm({ ...form, telephone: v })}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={form.motDePasse}
                onChangeText={(v) => setForm({ ...form, motDePasse: v })}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={form.confirmPassword}
              onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
            />

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.registerButtonText}>S'inscrire</Text>}
            </TouchableOpacity>

            {/* ✅ Bouton Google */}
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
  container:    { flex: 1, backgroundColor: '#e0f2fe' },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 16 },
  backButton:   {
    width: 45, height: 45, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#0ea5e9', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  header:       { marginBottom: 24 },
  title:        { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  subtitle:     { fontSize: 16, color: '#475569', marginTop: 8, lineHeight: 22 },
  card:         {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    shadowColor: '#0ea5e9', shadowOpacity: 0.08, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  row:          { flexDirection: 'row', marginBottom: 5 },
  input:        {
    backgroundColor: '#f8fafc', padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 15,
    fontSize: 16, color: '#0f172a',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    paddingHorizontal: 15, borderRadius: 16, marginBottom: 15,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  passwordInput:     { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0f172a' },
  registerButton:    {
    backgroundColor: '#0284c7', paddingVertical: 18, borderRadius: 18,
    alignItems: 'center', marginTop: 15, shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25,
    shadowRadius: 15, elevation: 5,
  },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  googleButton:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 18, borderRadius: 18,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1,
  },
  googleButtonText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
});

export default RegisterScreen;
