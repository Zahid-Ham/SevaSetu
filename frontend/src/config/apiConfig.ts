import Constants from 'expo-constants';

/**
 * Dynamically resolves the API base URL.
 * 
 * If running in Expo Go, it uses the host machine's IP address.
 * Otherwise, it defaults to the Android emulator loopback or a fallback.
 */
const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (hostUri) {
    // hostUri usually looks like "192.168.1.10:8081"
    const ip = hostUri.split(':')[0];
    const url = `http://${ip}:8000`;
    console.log(`[API Config] Dynamic URL detected: ${url}`);
    return url;
  }

  // Fallback for Android Emulator if no hostUri is found
  return 'http://10.0.2.2:8000';
};

export const API_BASE_URL = getBaseUrl();
