import { create } from 'zustand';

type Role = 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR' | null;

interface AuthState {
  role: Role;
  hasOnboarded: boolean;
  setRole: (role: Role) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  hasOnboarded: false,
  setRole: (role) => set({ role }),
  completeOnboarding: () => set({ hasOnboarded: true }),
  logout: () => set({ role: null }),
}));
