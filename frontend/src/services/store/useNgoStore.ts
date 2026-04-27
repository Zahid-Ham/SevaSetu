import { create } from 'zustand';
import * as api from '../api/ngoService';
import { NGO, VolunteerRequest } from '../api/ngoService';

interface NgoState {
  ngos: NGO[];
  pendingRequests: VolunteerRequest[];
  ngoVolunteers: any[];
  userRequest: VolunteerRequest | null;
  loading: boolean;
  error: string | null;

  loadNgos: () => Promise<void>;
  loadUserRequest: (citizenId: string) => Promise<void>;
  submitRequest: (request: any) => Promise<void>;
  loadPendingRequests: (ngoId: string) => Promise<void>;
  loadNgoVolunteers: (ngoId: string) => Promise<void>;
  updateRequest: (requestId: string, status: 'APPROVED' | 'REJECTED', supervisorId: string) => Promise<void>;
}

export const useNgoStore = create<NgoState>((set, get) => ({
  ngos: [],
  pendingRequests: [],
  ngoVolunteers: [],
  userRequest: null,
  loading: false,
  error: null,

  loadNgos: async () => {
    set({ loading: true, error: null });
    try {
      const ngos = await api.fetchNGOs();
      set({ ngos });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch NGOs' });
    } finally {
      set({ loading: false });
    }
  },

  loadUserRequest: async (citizenId: string) => {
    set({ loading: true, error: null });
    try {
      const request = await api.fetchUserRequest(citizenId);
      set({ userRequest: request });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch user request' });
    } finally {
      set({ loading: false });
    }
  },

  submitRequest: async (request: any) => {
    set({ loading: true, error: null });
    try {
      await api.submitVolunteerRequest(request);
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit application' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  loadPendingRequests: async (ngoId: string) => {
    set({ loading: true, error: null });
    try {
      const requests = await api.fetchPendingRequests(ngoId);
      set({ pendingRequests: requests });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch requests' });
    } finally {
      set({ loading: false });
    }
  },

  loadNgoVolunteers: async (ngoId: string) => {
    set({ loading: true, error: null });
    try {
      const volunteers = await api.fetchVolunteersByNgo(ngoId);
      set({ ngoVolunteers: volunteers });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch volunteers' });
    } finally {
      set({ loading: false });
    }
  },

  updateRequest: async (requestId: string, status: 'APPROVED' | 'REJECTED', supervisorId: string) => {
    set({ loading: true, error: null });
    try {
      await api.reviewVolunteerRequest(requestId, status, supervisorId);
      // Remove from pending list
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update request' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
