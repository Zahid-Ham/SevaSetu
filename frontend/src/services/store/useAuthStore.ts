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
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  user: null,
  hasOnboarded: false,
  
  setRole: (role) => {
    // If we're setting a role manually (like after volunteer approval)
    // we should try to keep the same user object if possible, just update role
    set((state) => {
      const newUser = state.user ? { ...state.user, role: role as any } : null;
      
      // Update EventStore.volunteerId if we're now a volunteer
      if (role === 'VOLUNTEER' && newUser) {
        useEventStore.getState().setVolunteerId(newUser.id);
      }
      
      return { role, user: newUser };
    });
  },

  login: async (email, pass) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (pass !== MOCK_PASSWORD) {
      return { success: false, message: 'Invalid password' };
    }

    const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
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
        useEventStore.getState().setVolunteerId(finalUser.id);
        useEventStore.getState().loadVolunteerProfile(finalUser.id);
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
