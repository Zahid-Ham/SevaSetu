import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEventStore } from './useEventStore';
import * as ngoService from '../api/ngoService';
import { firebaseAuthService, UserProfile } from '../auth/firebaseAuthService';
import { MOCK_USERS, MOCK_PASSWORD, User as MockUser } from '../mockAuthData';

// Map our local User type to what the rest of the app expects
export type Role = 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR' | null;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR';
  ngo_id?: string | null;
  ngo_name?: string | null;
  avatar?: string | null;
}

interface AuthState {
  role: Role;
  user: AppUser | null;
  hasOnboarded: boolean;
  isLoading: boolean;
  justLoggedOut: boolean;
  setRole: (role: Role) => void;
  setAuthSession: (user: AppUser, role: Role) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: (idToken: string, intendedRole: Role, accessToken?: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, pass: string, name: string, phone: string, role: Role, ngoName?: string) => Promise<{ success: boolean; message: string }>;
  sendOtp: (phone: string, recaptchaVerifier: any) => Promise<{ success: boolean; message: string; confirmation?: any }>;
  verifyOtp: (confirmation: any, otp: string, role: Role) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  completeOnboarding: () => void;
  setJustLoggedOut: (val: boolean) => void;
  initAuth: () => () => void; // Returns unsubscribe function
}

const IS_PROD = process.env.EXPO_PUBLIC_USE_PRODUCTION === 'true';

export const useAuthStore = create<AuthState>((set, get) => ({
  role: null,
  user: null,
  hasOnboarded: false,
  isLoading: true,
  justLoggedOut: false,
  
  setRole: (role) => {
    const normalizedRole = role ? (role.toUpperCase() as Role) : null;
    set((state) => {
      let newUser = state.user ? { ...state.user, role: normalizedRole as any } : null;
      
      // MOCK FALLBACK: If in dev and no user, pick a mock one
      if (!IS_PROD && !newUser && normalizedRole) {
        const defaultForRole = MOCK_USERS.find(u => u.role === normalizedRole);
        if (defaultForRole) {
          newUser = { ...defaultForRole, id: defaultForRole.id } as AppUser;
        }
      }
      
      if (normalizedRole === 'VOLUNTEER' && newUser) {
        useEventStore.getState().setVolunteerId(newUser.id);
      }
      
      return { role: normalizedRole, user: newUser };
    });
  },

  setAuthSession: (user, role) => {
    const normalizedRole = role ? (role.toUpperCase() as Role) : null;
    set({ user, role: normalizedRole, isLoading: false });
    if (normalizedRole === 'VOLUNTEER') {
      const es = useEventStore.getState();
      es.setVolunteerId(user.id);
      es.syncVolunteerProfile(user);
    }
  },

  loginWithGoogle: async (idToken: string, intendedRole: Role, accessToken?: string) => {
    set({ isLoading: true });
    try {
      const { user, profile } = await firebaseAuthService.loginWithGoogle(idToken, intendedRole as any, accessToken);
      
      if (!profile) {
        set({ isLoading: false });
        return { success: false, message: 'Failed to create user profile.' };
      }

      const appUser: AppUser = {
        id: profile.uid,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        ngo_id: profile.ngo_id,
        ngo_name: profile.ngo_name,
        avatar: profile.avatar
      };

      get().setAuthSession(appUser, profile.role);
      return { success: true, message: 'Google login successful' };
    } catch (error: any) {
      console.error('[AuthStore] Google Login Error:', error);
      return { success: false, message: error.message || 'Google Login failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, pass) => {
    // Removed global isLoading: true to prevent Splash redirect during login
    
    // ────────── PRODUCTION FLOW: REAL FIREBASE ──────────
    if (IS_PROD) {
      try {
        const { user, profile } = await firebaseAuthService.loginWithEmail(email, pass);
        
        if (!profile) {
          set({ isLoading: false });
          return { success: false, message: 'User profile not found in database.' };
        }

        const appUser: AppUser = {
          id: profile.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          ngo_id: profile.ngo_id,
          ngo_name: profile.ngo_name,
          avatar: profile.avatar
        };

        get().setAuthSession(appUser, profile.role);
        
        // Load volunteer specific data if needed
        if (profile.role === 'VOLUNTEER') {
          const eventStore = useEventStore.getState();
          await eventStore.loadAssignments(profile.uid);
          await eventStore.loadLiveMatches(profile.uid);
        }

        return { success: true, message: 'Login successful' };
      } catch (error: any) {
        set({ isLoading: false });
        console.error('[AuthStore] Firebase Login Error:', error);
        return { success: false, message: error.message || 'Login failed' };
      }
    }

    // ────────── DEV FLOW: MOCK AUTH ──────────
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (pass !== MOCK_PASSWORD) {
      set({ isLoading: false });
      return { success: false, message: 'Invalid password (Mock)' };
    }

    const foundUser = MOCK_USERS.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (foundUser) {
      const appUser: AppUser = { ...foundUser };
      let finalRole = foundUser.role;

      // UPGRADE CHECK: Real NGO service call even in dev if backend is up
      try {
        const request = await ngoService.fetchUserRequest(foundUser.id);
        if (request && request.status === 'APPROVED') {
          finalRole = 'VOLUNTEER';
          appUser.role = 'VOLUNTEER';
          appUser.ngo_id = request.ngo_id;
          appUser.ngo_name = request.ngo_name;
        }
      } catch (err) {
        console.warn('[AuthStore] Failed to fetch volunteer status (ignoring for mock)');
      }

      get().setAuthSession(appUser, finalRole);
      
      if (finalRole === 'VOLUNTEER') {
        const eventStore = useEventStore.getState();
        await eventStore.loadAssignments(appUser.id);
      }

      return { success: true, message: 'Mock Login successful' };
    }

      set({ isLoading: false });
      return { success: false, message: 'User not found in mock data' };
    },

  register: async (email, pass, name, phone, role, ngoName) => {
    // Removed global isLoading: true to prevent Splash redirect during register
    
    if (IS_PROD) {
      try {
        const { user, profile } = await firebaseAuthService.registerWithEmail(email, pass, name, phone, (role as any) || 'CITIZEN', ngoName);
        
        const appUser: AppUser = {
          id: profile.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          ngo_id: profile.ngo_id,
          ngo_name: profile.ngo_name,
          avatar: profile.avatar
        };

        get().setAuthSession(appUser, profile.role);
        return { success: true, message: 'Registration successful' };
      } catch (error: any) {
        set({ isLoading: false });
        console.error('[AuthStore] Firebase Register Error:', error);
        return { success: false, message: error.message || 'Registration failed' };
      }
    }

    // Mock Registration
    await new Promise(resolve => setTimeout(resolve, 800));
    const newUser: AppUser = {
      id: `mock_${Date.now()}`,
      name,
      email,
      phone,
      role: role || 'CITIZEN',
      ngo_name: ngoName || null,
      ngo_id: ngoName ? `mock_ngo_${Date.now()}` : null
    };
    
    get().setAuthSession(newUser, newUser.role);
    return { success: true, message: 'Mock Registration successful' };
  },

  sendOtp: async (phone, recaptchaVerifier) => {
    if (IS_PROD) {
      try {
        const confirmation = await firebaseAuthService.sendPhoneOtp(phone, recaptchaVerifier);
        return { success: true, message: 'OTP sent', confirmation };
      } catch (error: any) {
        return { success: false, message: error.message || 'Failed to send OTP' };
      }
    }
    // Mock
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, message: 'Mock OTP sent (Any 6 digits will work)' };
  },

  verifyOtp: async (confirmation, otp, role) => {
    // Removed global isLoading: true to prevent Splash redirect during verifyOtp
    if (IS_PROD) {
      try {
        const { profile } = await firebaseAuthService.verifyOtp(confirmation, otp);
        const appUser: AppUser = {
          id: profile.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          ngo_id: profile.ngo_id,
          ngo_name: profile.ngo_name,
          avatar: profile.avatar
        };
        get().setAuthSession(appUser, profile.role);
        return { success: true, message: 'OTP verified' };
      } catch (error: any) {
        set({ isLoading: false });
        return { success: false, message: error.message || 'Invalid OTP' };
      }
    }
    
    // Mock Verify
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockUser = MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0];
    get().setAuthSession({ ...mockUser, id: mockUser.id } as AppUser, role || 'CITIZEN');
    return { success: true, message: 'Mock OTP verified' };
  },

  logout: async () => {
    try {
      if (IS_PROD) {
        await firebaseAuthService.signOut();
      }
    } catch (e) {
      console.warn('Firebase signout failed', e);
    }
    
    useEventStore.getState().resetStore();
    set({ role: null, user: null, justLoggedOut: true });
  },

  setJustLoggedOut: (val: boolean) => set({ justLoggedOut: val }),

  completeOnboarding: async () => {
    set({ hasOnboarded: true });
    try {
      await AsyncStorage.setItem('@sevasetu_onboarded', 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state', e);
    }
  },

  initAuth: () => {
    console.log('[AuthStore] Initializing Firebase Auth listener...');
    
    // Load onboarding state from disk
    AsyncStorage.getItem('@sevasetu_onboarded').then(val => {
      if (val === 'true') {
        set({ hasOnboarded: true });
      }
    });

    return firebaseAuthService.onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        console.log(`[AuthStore] Session detected for: ${firebaseUser.email}`);
        try {
          const profile = await firebaseAuthService.getUserProfile(firebaseUser.uid);
          if (profile) {
            const appUser: AppUser = {
              id: profile.uid,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              role: profile.role,
              ngo_id: profile.ngo_id,
              ngo_name: profile.ngo_name,
              avatar: profile.avatar
            };
            get().setAuthSession(appUser, profile.role);
          } else {
            console.warn('[AuthStore] Logged in but no Firestore profile found.');
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('[AuthStore] Failed to fetch session profile:', error);
          set({ isLoading: false });
        }
      } else {
        console.log('[AuthStore] No active session.');
        set({ user: null, role: null, isLoading: false });
      }
    });
  }
}));
