import Constants from 'expo-constants';

/**
 * Dynamically resolves the API base URL.
 * 
 * If running in Expo Go, it uses the host machine's IP address.
 * Otherwise, it defaults to the Android emulator loopback or a fallback.
 */
const getBaseUrl = () => {
  // Use Production URL if explicitly set in .env
  if (process.env.EXPO_PUBLIC_USE_PRODUCTION === 'true') {
    return process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 'https://sevasetu-api-server-141636692341.asia-south1.run.app';
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    const url = `http://${ip}:8000`;
    console.log(`[API Config] Dynamic URL detected: ${url}`);
    return url;
  }

  // Fallback for Android Emulator if no hostUri is found
  return 'http://10.0.2.2:8000';
};

export const API_BASE_URL = getBaseUrl();
