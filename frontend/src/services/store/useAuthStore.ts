import { create } from 'zustand';
import { useEventStore } from './useEventStore';
import * as ngoService from '../api/ngoService';

import { MOCK_USERS, MOCK_PASSWORD, User } from '../mockAuthData';

type Role = 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR' | null;

interface AuthState {
  role: Role;
  user: User | null;
  hasOnboarded: boolean;
  setRole: (role: Role) => void;
  setAuthSession: (user: User, role: Role) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  user: null,
  hasOnboarded: false,
  
  setRole: (role) => {
    set((state) => {
      // If we have a user from auth but no volunteerId set in event store yet, fix it
      let newUser = state.user ? { ...state.user, role: role as any } : null;
      
      // MOCK FALLBACK: If we're setting a role but have no user (e.g. anonymous start or broken OTP)
      // Pick a default from MOCK_USERS for the demo so we have a name/NGO context
      if (!newUser && role) {
        const defaultForRole = MOCK_USERS.find(u => u.role === role);
        if (defaultForRole) newUser = { ...defaultForRole };
      }
      
      if (role === 'VOLUNTEER' && newUser) {
        useEventStore.getState().setVolunteerId(newUser.id);
      }
      
      return { role, user: newUser };
    });
  },

  setAuthSession: (user, role) => {
    set({ user, role });
    if (role === 'VOLUNTEER') {
      const es = useEventStore.getState();
      es.setVolunteerId(user.id);
      es.syncVolunteerProfile(user);
    }
  },

  login: async (email, pass) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (pass !== MOCK_PASSWORD) {
      return { success: false, message: 'Invalid password' };
    }

    const foundUser = MOCK_USERS.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (foundUser) {
      let finalRole = foundUser.role;
      let finalUser = { ...foundUser };

      // UPGRADE CHECK: If they are a citizen, check if they've been approved as a volunteer
      if (finalRole === 'CITIZEN') {
        try {
          const request = await ngoService.fetchUserRequest(foundUser.id);
          if (request && request.status === 'APPROVED') {
            console.log(`[AuthStore] Upgrading ${foundUser.name} to VOLUNTEER status based on approved request.`);
            finalRole = 'VOLUNTEER';
            finalUser.role = 'VOLUNTEER';
            // Also link the NGO from the request if missing
            finalUser.ngo_id = request.ngo_id;
            finalUser.ngo_name = request.ngo_name;
          }
        } catch (err) {
          console.warn('[AuthStore] Failed to fetch volunteer status during login:', err);
        }
      }

      set({ role: finalRole, user: finalUser });

      // Link to EventStore if volunteer
      if (finalRole === 'VOLUNTEER') {
        const eventStore = useEventStore.getState();
        eventStore.setVolunteerId(finalUser.id);
        
        // SYNC: Ensure profile exists in Firestore and load assignments immediately
        await eventStore.syncVolunteerProfile(finalUser);
        await eventStore.loadAssignments(finalUser.id);
        await eventStore.loadLiveMatches(finalUser.id);
      }

      return { success: true, message: 'Login successful' };
    }

    return { success: false, message: 'User not found' };
  },

  completeOnboarding: () => set({ hasOnboarded: true }),
  
  logout: () => {
    useEventStore.getState().resetStore();
    set({ role: null, user: null });
  },
}));
