import React, { useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Redirige vers la page principale après 1,5 seconde
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.logoWrapper}>
        <Image
          source={require('../assets/images/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f2fe', // light sky blue background matching the login page
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 160,
    height: 160,
    backgroundColor: '#ffffff',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
});
