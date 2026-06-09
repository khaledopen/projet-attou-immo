import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Injecter automatiquement le token JWT de AsyncStorage dans chaque requête si présent
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Ajouter un intercepteur de réponse pour les tentatives automatiques et le rafraîchissement du token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    
    // Handle 401 Unauthorized (token expired)
    if (response && response.status === 401 && config && !config._isRetryForAuth) {
      config._isRetryForAuth = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('[Axios Refresh] Access token expiré. Rafraîchissement...');
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }, {
            headers: {
              'bypass-tunnel-reminder': 'true',
              'ngrok-skip-browser-warning': 'true',
            }
          });
          
          const { token: newAccessToken, refreshToken: newRefreshToken } = res.data;
          
          await AsyncStorage.setItem('userToken', newAccessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
          
          console.log('[Axios Refresh] Tokens rafraîchis. Reprise de la requête.');
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(config);
        }
      } catch (refreshError: any) {
        console.warn('[Axios Refresh] Échec de rafraîchissement:', refreshError.message);
        await AsyncStorage.multiRemove(['userToken', 'userData', 'refreshToken']);
      }
    }

    // Vérifier s'il s'agit d'une erreur réseau ou de proxy temporaire
    const isTransientError = 
      !response || 
      [502, 503, 504].includes(response.status) || 
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout');

    // Si la configuration existe et qu'il s'agit d'une erreur temporaire, initialiser/incrémenter le compteur de tentatives
    if (config && isTransientError) {
      config._retryCount = config._retryCount || 0;
      const maxRetries = 5;
      const delayMs = 2000;

      if (config._retryCount < maxRetries) {
        config._retryCount += 1;
        console.log(`[Axios Retry] Tentative ${config._retryCount}/${maxRetries} pour ${config.url} suite à l'erreur: ${error.message}`);
        
        // Attendre avant de réessayer
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        // Relancer la requête
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
