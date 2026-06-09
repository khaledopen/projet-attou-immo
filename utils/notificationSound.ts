import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Actifs sonores
const MESSAGE_SOUND = require('../assets/sounds/message.mp3');
const NOTIFICATION_SOUND = require('../assets/sounds/notification.mp3');

let messageSoundObject: Audio.Sound | null = null;
let notificationSoundObject: Audio.Sound | null = null;

/**
 * Configure audio mode for background/silent mode compatibility
 */
const configureAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.log('[NotificationSound] Audio config error:', error);
  }
};

/**
 * Play the message received sound
 */
export const playMessageSound = async () => {
  try {
    await configureAudio();

    // Décharger l'instance précédente si elle existe
    if (messageSoundObject) {
      try {
        await messageSoundObject.unloadAsync();
      } catch {}
      messageSoundObject = null;
    }

    const { sound } = await Audio.Sound.createAsync(MESSAGE_SOUND, {
      shouldPlay: true,
      volume: 0.8,
    });
    messageSoundObject = sound;

    // Nettoyage automatique après lecture
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        messageSoundObject = null;
      }
    });
  } catch (error) {
    console.log('[NotificationSound] Error playing message sound:', error);
  }
};

/**
 * Play the notification/announcement sound
 */
export const playNotificationSound = async () => {
  try {
    await configureAudio();

    // Décharger l'instance précédente si elle existe
    if (notificationSoundObject) {
      try {
        await notificationSoundObject.unloadAsync();
      } catch {}
      notificationSoundObject = null;
    }

    const { sound } = await Audio.Sound.createAsync(NOTIFICATION_SOUND, {
      shouldPlay: true,
      volume: 1.0,
    });
    notificationSoundObject = sound;

    // Nettoyage automatique après lecture
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        notificationSoundObject = null;
      }
    });
  } catch (error) {
    console.log('[NotificationSound] Error playing notification sound:', error);
  }
};

/**
 * Cleanup all loaded sounds (call on unmount)
 */
export const unloadSounds = async () => {
  try {
    if (messageSoundObject) {
      await messageSoundObject.unloadAsync();
      messageSoundObject = null;
    }
    if (notificationSoundObject) {
      await notificationSoundObject.unloadAsync();
      notificationSoundObject = null;
    }
  } catch (error) {
    console.log('[NotificationSound] Error unloading sounds:', error);
  }
};
