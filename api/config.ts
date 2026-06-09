import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Default fallback IP (adjust to your machine's LAN IP if needed)
let backendIP = process.env.EXPO_PUBLIC_BACKEND_IP || '192.168.1.16';

// Helper to extract development host IP from Expo Constants
const getDevHostIP = (): string | null => {
  // 1. Vérifier l'hostUri depuis expoConfig (Expo Go)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri.split(':')[0];

  // 2. Vérifier le debuggerHost depuis expoConfig
  const debuggerHost = Constants.expoConfig?.debuggerHost;
  if (debuggerHost) return debuggerHost.split(':')[0];

  // 3. Vérifier le debuggerHost depuis le manifest (anciennes versions de SDK)
  const manifestDebuggerHost = Constants.manifest?.debuggerHost;
  if (manifestDebuggerHost) return manifestDebuggerHost.split(':')[0];

  // 4. Vérifier manifest2 (versions plus récentes de SDK / Expo Go)
  const manifest2Uri = (Constants as any).manifest2?.extra?.expoGoLaunchQueryParams?.hostUri;
  if (manifest2Uri) return manifest2Uri.split(':')[0];

  return null;
};

// Enhanced IP detection for development environments
if (__DEV__) {
  const detectedIP = getDevHostIP();
  if (detectedIP) {
    backendIP = detectedIP;
    console.log(`[Config] Automatically detected Metro Bundler IP: ${backendIP}`);
  } else if (Platform.OS === 'web') {
    backendIP = 'localhost';
  } else if (Platform.OS === 'android') {
    // If we're on android emulator without detected host, fallback to local loopback
    // For physical devices, we use our exact host IP fallback (192.168.1.16)
    backendIP = '192.168.1.16'; 
  }
}

// Activez le tunnel via la variable d'environnement USE_TUNNEL (true/false)
const USE_TUNNEL = process.env.EXPO_PUBLIC_USE_TUNNEL === 'true' || process.env.USE_TUNNEL === 'true';
const TUNNEL_URL = process.env.EXPO_PUBLIC_TUNNEL_URL || process.env.TUNNEL_URL || 'https://shiny-moments-sort.loca.lt';

export const BASE_URL = USE_TUNNEL ? `${TUNNEL_URL}/api` : `http://${backendIP}:5000/api`;
export const SOCKET_URL = USE_TUNNEL ? TUNNEL_URL : `http://${backendIP}:5000`;

// ✅ URL de callback Google (mise à jour dynamique selon le tunnel)
export const GOOGLE_CALLBACK_URL = `${USE_TUNNEL ? TUNNEL_URL : `http://${backendIP}:5000`}/api/auth/google/callback`;

