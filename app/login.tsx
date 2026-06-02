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
import { GOOGLE_CALLBACK_URL } from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// ✅ Client ID Web depuis Google Cloud Console
const GOOGLE_CLIENT_ID_WEB = '57003195747-e1denhbqp169eucbkjjsoq2jvmqruhlk.apps.googleusercontent.com';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        // Compte existant → connexion
        const loginRes = await api.post('/auth/login', {
          email: googleEmail,
          password: googlePassword,
        });
        const { token, user } = loginRes.data;
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        Alert.alert('Connexion réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
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
          Alert.alert('Inscription réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      router.replace('/(tabs)');
    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      let msg = 'Email ou mot de passe incorrect.';
      if (error.response) {
        if (error.response.data && typeof error.response.data === 'object' && error.response.data.message) {
          msg = error.response.data.message;
        } else if (error.response.status === 404) {
          msg = "Ce mail n'a pas de compte.";
        }
      } else if (error.message) {
        msg = error.message;
      }
      Alert.alert('Échec', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // 1) URL de callback sur notre backend (page trampoline via Localtunnel HTTPS)
      const backendCallback = GOOGLE_CALLBACK_URL;

      // 2) Deep link de retour dans l'app (Expo Go / dev build)
      const appReturnUrl = Linking.createURL('oauth-callback');

      // 3) State encodé en base64 (contient le deep link de retour + rôle)
      const statePayload = JSON.stringify({ redirect_to: appReturnUrl, role: 'LOCATAIRE' });
      const stateB64 = btoa(statePayload);

      // 4) Construction manuelle de l'URL Google OAuth (implicit flow)
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID_WEB)}&redirect_uri=${encodeURIComponent(backendCallback)}&response_type=token&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(stateB64)}`;

      console.log('[Google] Opening auth URL:', googleAuthUrl);
      console.log('[Google] Backend callback:', backendCallback);
      console.log('[Google] App return URL:', appReturnUrl);

      // 5) Ouvrir le navigateur et écouter le retour deep link
      const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, appReturnUrl);

      console.log('[Google] Browser result:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.url) {
        // Extraire le token de l'URL de retour
        const url = Linking.parse(result.url);
        const accessToken = url.queryParams?.access_token as string | undefined;
        console.log('[Google] Extracted access_token:', accessToken ? '✓ present' : '✗ missing');

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          >
            <Ionicons name="arrow-back" size={24} color="#0284c7" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="home" size={40} color="#0284c7" />
            </View>
            <Text style={styles.title}>AttouHome</Text>
            <Text style={styles.subtitle}>Trouvez votre futur chez-vous en quelques clics.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Adresse Email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginButtonText}>Se connecter</Text>}
            </TouchableOpacity>

            {/* ✅ Bouton Google */}
            <TouchableOpacity
              style={[styles.googleButton, loading && { opacity: 0.6 }]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Image
                source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                style={{ width: 20, height: 20, marginRight: 10 }}
              />
              <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#e0f2fe' },
  keyboardView:   { flex: 1 },
  scrollContent:  { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:         { alignItems: 'center', marginBottom: 35 },
  logoContainer:  {
    width: 80, height: 80, backgroundColor: '#fff', borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#0ea5e9', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  title:          { fontSize: 36, fontWeight: '900', color: '#0f172a' },
  subtitle:       { fontSize: 16, color: '#475569', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, lineHeight: 22 },
  card:           {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    shadowColor: '#0ea5e9', shadowOpacity: 0.08, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 18, paddingHorizontal: 15, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  inputIcon:      { marginRight: 12 },
  input:          { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0f172a' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotText:     { color: '#0284c7', fontWeight: '700', fontSize: 14 },
  loginButton:    {
    backgroundColor: '#0284c7', paddingVertical: 18, borderRadius: 18,
    alignItems: 'center', shadowColor: '#0284c7', shadowOpacity: 0.25,
    shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  googleButton:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 18, borderRadius: 18,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1,
  },
  googleButtonText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  footer:         { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:     { color: '#64748b', fontSize: 15 },
  registerLink:   { color: '#0284c7', fontWeight: '800', fontSize: 15 },
  backButton:     {
    width: 45, height: 45, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#0ea5e9', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
});

export default LoginScreen;
