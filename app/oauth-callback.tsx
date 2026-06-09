import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { access_token, role } = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('OAuth Callback Params:', { access_token, role });
    if (access_token) {
      handleGoogleToken(access_token as string, (role as string) || 'LOCATAIRE');
    } else {
      setError('Token d\'accès Google manquant.');
    }
  }, [access_token, role]);

  const handleGoogleToken = async (tokenStr: string, userRole: string) => {
    try {
      console.log('OAuth Callback: Fetching Google profile info...');
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenStr}` },
      });
      const googleProfile = await userInfoRes.json();
      console.log('OAuth Callback: Google profile retrieved:', JSON.stringify(googleProfile, null, 2));

      if (!googleProfile.email) {
        throw new Error('Email non disponible sur votre compte Google.');
      }

      const { email: googleEmail, given_name, family_name } = googleProfile;
      const googlePassword = `GoogleAuthSecurePass123!_${googleEmail}`;

      try {
        console.log('OAuth Callback: Checking if user already exists...', googleEmail);
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
          email: googleEmail,
          password: googlePassword,
        });
        const { token, refreshToken, user } = loginRes.data;
        await AsyncStorage.setItem('userToken', token);
        if (refreshToken) {
          await AsyncStorage.setItem('refreshToken', refreshToken);
        }
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        Alert.alert('Connexion réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
        router.replace('/(tabs)');
      } catch (loginErr: any) {
        console.log('OAuth Callback: User not found, registering...', loginErr?.response?.data || loginErr?.message);
        
        try {
          const regRes = await axios.post(`${BASE_URL}/auth/register`, {
            email: googleEmail,
            password: googlePassword,
            nom: family_name || googleProfile.name || 'Nom',
            prenom: given_name || 'Prénom',
            telephone: googleProfile.phone || null,
            role: userRole,
          });
          console.log('OAuth Callback: Registration success:', JSON.stringify(regRes.data));

          const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: googleEmail,
            password: googlePassword,
          });
          const { token, refreshToken: regRefreshToken, user } = loginRes.data;
          await AsyncStorage.setItem('userToken', token);
          if (regRefreshToken) {
            await AsyncStorage.setItem('refreshToken', regRefreshToken);
          }
          await AsyncStorage.setItem('userData', JSON.stringify(user));
          Alert.alert('Inscription réussie ! 🎉', `Bienvenue ${user.prenom} ${user.nom}`);
          router.replace('/(tabs)');
        } catch (regErr: any) {
          console.error('OAuth Callback: Registration error:', regErr?.response?.data || regErr?.message);
          throw new Error('Erreur lors de la création du compte.');
        }
      }
    } catch (err: any) {
      console.error('OAuth Callback Error:', err);
      setError(err.message || 'Impossible de synchroniser avec Google.');
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Échec de la connexion</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.button} onPress={() => router.replace('/login')}>
          Retour à la page de connexion
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0284c7" />
      <Text style={styles.loadingText}>Synchronisation en cours...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#64748b',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
