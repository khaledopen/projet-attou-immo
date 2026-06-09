import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import api from '../api/axiosInstance';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez saisir votre adresse e-mail.');
      return;
    }
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const msg = error.response?.data?.message || 'Une erreur est survenue. Réessayez.';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0284c7" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={40} color="#0284c7" />
            </View>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>
              Entrez l'adresse e-mail associée à votre compte propriétaire et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>E-mail envoyé ! 📬</Text>
              <Text style={styles.successText}>
                Si un compte est associé à cette adresse e-mail, vous recevrez un lien de réinitialisation. 
                Vérifiez votre boîte de réception et vos spams.
              </Text>
              <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace('/login')}>
                <Text style={styles.backToLoginText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse e-mail"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitButtonText}>Envoyer le lien</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
                <Text style={styles.cancelLinkText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0f2fe' },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'flex-start' },
  backButton: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0284c7', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    marginBottom: 20,
  },
  header: { alignItems: 'center', marginBottom: 35 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 25,
    backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, shadowColor: '#0284c7', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 16,
    paddingHorizontal: 16, height: 56,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  submitButton: {
    backgroundColor: '#0284c7', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', shadowColor: '#0284c7', shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 4,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelLinkText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  successCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 30,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, elevation: 4,
  },
  successIcon: { marginBottom: 15 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  successText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  backToLoginBtn: {
    backgroundColor: '#0284c7', paddingVertical: 14, paddingHorizontal: 30,
    borderRadius: 16, shadowColor: '#0284c7', shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 4,
  },
  backToLoginText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
