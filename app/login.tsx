import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
      const { token, user } = response.data;
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Échec', 'Email ou mot de passe incorrect.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Se connecter</Text>}
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
  container: { flex: 1, backgroundColor: '#e0f2fe' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 35 },
  logoContainer: { width: 80, height: 80, backgroundColor: '#fff', borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#0ea5e9', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title: { fontSize: 36, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#475569', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#0ea5e9', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, paddingHorizontal: 15, marginBottom: 16, borderWidth: 1.5, borderColor: '#e2e8f0' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0f172a' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotText: { color: '#0284c7', fontWeight: '700', fontSize: 14 },
  loginButton: { backgroundColor: '#0284c7', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#0284c7', shadowOpacity: 0.25, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#64748b', fontSize: 15 },
  registerLink: { color: '#0284c7', fontWeight: '800', fontSize: 15 }
});

export default LoginScreen;
