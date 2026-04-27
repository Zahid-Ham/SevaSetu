import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  Auth,
  // @ts-ignore - Some TS configs don't see this export even though it exists in React Native environments
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with Persistence for React Native
let auth: Auth;
try {
  // Try initializing with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence ? getReactNativePersistence(ReactNativeAsyncStorage) : undefined
  });
} catch (e) {
  // Fallback if already initialized or if persistence fails
  try {
    auth = getAuth(app);
  } catch (err) {
    auth = initializeAuth(app);
  }
}

// 🧪 DEVELOPER BYPASS: Allow phone auth to work in Expo Go/Simulators without reCAPTCHA
if (process.env.EXPO_PUBLIC_USE_PRODUCTION !== 'true' || __DEV__) {
  console.log('[FirebaseConfig] Enabling App Verification Bypass for testing...');
  auth.settings.appVerificationDisabledForTesting = true;
}

// Initialize Services
export { auth };
export const db: Firestore = getFirestore(app);

export default app;
