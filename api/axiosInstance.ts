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

// Automatically inject JWT token from AsyncStorage into every request if present
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

// Add response interceptor for automatic retries on transient errors (502, 503, 504, timeout, network error)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    
    // Check if it's a transient network or proxy error
    const isTransientError = 
      !response || 
      [502, 503, 504].includes(response.status) || 
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout');

    // If config exists and it's a transient error, initialize/increment retry counter
    if (config && isTransientError) {
      config._retryCount = config._retryCount || 0;
      const maxRetries = 5;
      const delayMs = 2000;

      if (config._retryCount < maxRetries) {
        config._retryCount += 1;
        console.log(`[Axios Retry] Tentative ${config._retryCount}/${maxRetries} pour ${config.url} suite à l'erreur: ${error.message}`);
        
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        // Re-run the request
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
