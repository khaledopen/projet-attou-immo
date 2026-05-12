import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="home" size={40} color="#059669" />
          </View>
          <Text style={styles.title}>AttouHome 🏠</Text>
          <Text style={styles.subtitle}>Trouvez votre futur chez-vous en quelques clics.</Text>
        </View>

        <View style={styles.form}>
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 30 },
  header: { alignItems: 'center', marginBottom: 50 },
  logoContainer: { width: 80, height: 80, backgroundColor: '#ecfdf5', borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 36, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 12, paddingHorizontal: 20, lineHeight: 22 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, paddingHorizontal: 15, marginBottom: 18, borderWidth: 1.5, borderColor: '#f1f5f9' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 18, fontSize: 16, color: '#1e293b' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 35 },
  forgotText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  loginButton: { backgroundColor: '#059669', paddingVertical: 20, borderRadius: 18, alignItems: 'center', shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 35 },
  footerText: { color: '#64748b', fontSize: 15 },
  registerLink: { color: '#059669', fontWeight: '800', fontSize: 15 }
});

export default LoginScreen;
