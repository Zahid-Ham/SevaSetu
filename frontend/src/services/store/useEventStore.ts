/**
 * useEventStore.ts
 * Zustand store for predictions, assignments, notifications, and volunteer profile.
 */

import { create } from 'zustand';
import {
  PredictedEvent,
  VolunteerAssignment,
  AppNotification,
  VolunteerProfile,
  LiveMatch,
  fetchPredictions,
  fetchAssignmentsForVolunteer,
  fetchNotifications,
  confirmPrediction,
  dismissPrediction,
  respondToAssignment,
  updateVolunteerProfile,
  fetchVolunteerProfile,
  markNotificationRead,
  generatePredictions,
  fetchAssignmentsForEvent,
  createManualEvent,
  deletePrediction,
  stopEvent,
  seedPredictions,
  fetchLiveMatches,
} from '../api/eventPredictionService';
import * as api from '../api/eventPredictionService';

interface EventState {
  // Data
  predictions: PredictedEvent[];
  assignments: VolunteerAssignment[];
  notifications: AppNotification[];
  eventAssignments: VolunteerAssignment[];
  volunteerId: string;
  volunteerProfile: VolunteerProfile | null;
  allVolunteerProfiles: VolunteerProfile[];
  liveMatches: LiveMatch[]; // Real-time matches against confirmed events

  // Loading states
  loadingPredictions: boolean;
  loadingAssignments: boolean;
  loadingNotifications: boolean;
  loadingAction: boolean;

  // Actions — data fetching
  loadPredictions: () => Promise<void>;
  triggerNewPredictions: (area?: string) => Promise<void>;
  loadAssignments: (volunteerId: string) => Promise<void>;
  loadEventAssignments: (eventId: string) => Promise<void>;
  loadNotifications: (volunteerId: string) => Promise<void>;
  loadVolunteerProfile: (volunteerId: string) => Promise<void>;
  loadAllVolunteerProfiles: () => Promise<void>;
  loadLiveMatches: (volunteerId: string) => Promise<void>;
  joinMatch: (eventId: string, volunteerId: string, status: 'accepted' | 'declined', match_score?: number, score_breakdown?: any) => Promise<void>; // Updated

  // Actions — mutations
  confirmEvent: (eventId: string, options?: {
    predicted_date_start?: string;
    predicted_date_end?: string;
    estimated_headcount?: number;
  }) => Promise<void>;
  dismissEvent: (eventId: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  stopEvent: (eventId: string) => Promise<void>;
  respondAssignment: (assignmentId: string, status: 'accepted' | 'declined') => Promise<void>;
  saveVolunteerProfile: (profile: VolunteerProfile) => Promise<void>;
  readNotification: (notificationId: string) => void;
  addManualEvent: (payload: any) => Promise<void>;
  resetStore: () => void;
  setVolunteerId: (id: string) => void; // New
  seedInitialMissions: () => Promise<void>; // New

  // Computed helpers
  unreadCount: () => number;
  pendingAssignments: () => VolunteerAssignment[];
  acceptedAssignments: () => VolunteerAssignment[];
  pastAssignments: () => VolunteerAssignment[];
}

export const useEventStore = create<EventState>((set, get) => ({
  predictions: [],
  assignments: [],
  notifications: [],
  eventAssignments: [],
   volunteerId: '',
  volunteerProfile: null,
  allVolunteerProfiles: [],
  liveMatches: [],
  loadingPredictions: false,
  loadingAssignments: false,
  loadingNotifications: false,
  loadingAction: false,

  // ── Predictions ─────────────────────────────────────────────────────────────

  loadPredictions: async () => {
    set({ loadingPredictions: true });
    try {
      const predictions = await fetchPredictions();
      set({ predictions });
    } catch (e) {
      console.error('[useEventStore] loadPredictions:', e);
    } finally {
      set({ loadingPredictions: false });
    }
  },

  triggerNewPredictions: async (area = 'Maharashtra') => {
    set({ loadingPredictions: true });
    try {
      await generatePredictions(area);
      // Re-load all predictions to get the merged set (Live + New Forecasts)
      const allPredictions = await fetchPredictions();
      set({ predictions: allPredictions });
    } catch (e) {
      console.error('[useEventStore] triggerNewPredictions:', e);
    } finally {
      set({ loadingPredictions: false });
    }
  },

  confirmEvent: async (eventId: string, options?: any) => {
    set({ loadingAction: true });
    try {
      // Find the event in our local predictions to get its metadata for upsert
      const event = get().predictions.find(p => p.id === eventId);
      const payload = event ? { ...event, ...options } : options;
      
      await confirmPrediction(eventId, payload);
      // Refresh predictions to pull the real ID from DB if it was a mock
      const predictions = await fetchPredictions();
      set({ predictions });
    } catch (e) {
      console.error('[useEventStore] confirmEvent:', e);
    } finally {
      set({ loadingAction: false });
    }
  },

  dismissEvent: async (eventId: string) => {
    set({ loadingAction: true });
    try {
      await dismissPrediction(eventId);
      set((state) => ({
        predictions: state.predictions.filter((p) => p.id !== eventId),
      }));
    } finally {
      set({ loadingAction: false });
    }
  },

  deleteEvent: async (eventId: string) => {
    set({ loadingAction: true });
    try {
      await deletePrediction(eventId);
      set((state) => ({
        predictions: state.predictions.filter((p) => p.id !== eventId),
      }));
    } finally {
      set({ loadingAction: false });
    }
  },

  stopEvent: async (eventId: string) => {
    set({ loadingAction: true });
    try {
      await stopEvent(eventId);
      set((state) => ({
        predictions: state.predictions.map((p) => 
          p.id === eventId ? { ...p, status: 'dismissed' } : p
        ),
      }));
    } finally {
      set({ loadingAction: false });
    }
  },

  // ── Assignments ──────────────────────────────────────────────────────────────

  loadAssignments: async (volunteerId: string) => {
    set({ loadingAssignments: true });
    try {
      const assignments = await fetchAssignmentsForVolunteer(volunteerId);
      set({ assignments });
    } catch (e) {
      console.error('[useEventStore] loadAssignments:', e);
    } finally {
      set({ loadingAssignments: false });
    }
  },

  loadEventAssignments: async (eventId: string) => {
    set({ loadingAssignments: true });
    try {
      const eventAssignments = await fetchAssignmentsForEvent(eventId);
      set({ eventAssignments });
    } finally {
      set({ loadingAssignments: false });
    }
  },

  respondAssignment: async (assignmentId: string, status: 'accepted' | 'declined') => {
    set({ loadingAction: true });
    try {
      await respondToAssignment(assignmentId, status);
      // Refresh everything to ensure counts update in real-time
      const [assignments, predictions] = await Promise.all([
        fetchAssignmentsForVolunteer(get().volunteerId),
        fetchPredictions()
      ]);
      set({ assignments, predictions });
    } catch (e) {
      console.error('[useEventStore] respondAssignment:', e);
    } finally {
      set({ loadingAction: false });
    }
  },

  // ── Notifications ────────────────────────────────────────────────────────────

  loadNotifications: async (volunteerId: string) => {
    set({ loadingNotifications: true });
    try {
      const notifications = await fetchNotifications(volunteerId);
      set({ notifications });
    } catch (e) {
      console.error('[useEventStore] loadNotifications:', e);
    } finally {
      set({ loadingNotifications: false });
    }
  },

  readNotification: (notificationId: string) => {
    markNotificationRead(notificationId);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  },

  addManualEvent: async (payload: any) => {
    set({ loadingAction: true });
    try {
      await createManualEvent(payload);
      // Refresh predictions after creating a manual one
      const predictions = await fetchPredictions();
      set({ predictions });
    } finally {
      set({ loadingAction: false });
    }
  },

  // ── Volunteer Profile ────────────────────────────────────────────────────────

  loadVolunteerProfile: async (volunteerId: string) => {
    try {
      const volunteerProfile = await fetchVolunteerProfile(volunteerId);
      set({ volunteerProfile });
    } catch (e) {
      console.error('[useEventStore] loadVolunteerProfile:', e);
    }
  },

  saveVolunteerProfile: async (profile: VolunteerProfile) => {
    set({ loadingAction: true });
    try {
      await updateVolunteerProfile(profile);
      set({ volunteerProfile: profile });
      // Immediately re-run live matching with new profile
      const liveMatches = await fetchLiveMatches(profile.volunteer_id);
      set({ liveMatches });
    } finally {
      set({ loadingAction: false });
    }
  },

  loadLiveMatches: async (volunteerId: string) => {
    try {
      const liveMatches = await api.fetchLiveMatches(volunteerId);
      set({ liveMatches: Array.isArray(liveMatches) ? liveMatches : [] });
    } catch (e) {
      console.error('[useEventStore] loadLiveMatches:', e);
      set({ liveMatches: [] });
    }
  },

  joinMatch: async (eventId: string, volunteerId: string, status: 'accepted' | 'declined', match_score?: number, score_breakdown?: any) => {
    set({ loadingAction: true });
    try {
      await api.joinLiveMatch({ 
        event_id: eventId, 
        volunteer_id: volunteerId, 
        status,
        match_score,
        score_breakdown
      });
      // Refresh both
      const [assignments, liveMatches] = await Promise.all([
        api.fetchAssignmentsForVolunteer(volunteerId),
        api.fetchLiveMatches(volunteerId),
      ]);
      set({ assignments, liveMatches });
    } finally {
      set({ loadingAction: false });
    }
  },

  loadAllVolunteerProfiles: async () => {
    try {
      const data = await api.apiFetch<any>('/volunteers/all', undefined, { volunteers: [] });
      set({ allVolunteerProfiles: Array.isArray(data.volunteers) ? data.volunteers : [] });
    } catch (e) {
      console.error('[useEventStore] loadAllVolunteerProfiles:', e);
      set({ allVolunteerProfiles: [] });
    }
  },

  setVolunteerId: (id: string) => {
    set({ volunteerId: id });
  },

  resetStore: () => {
    set({
      predictions: [],
      assignments: [],
      notifications: [],
      eventAssignments: [],
      volunteerProfile: null,
      allVolunteerProfiles: [],
    });
  },

  seedInitialMissions: async () => {
    set({ loadingAction: true });
    try {
      const predictions = await seedPredictions();
      set({ predictions });
    } finally {
      set({ loadingAction: false });
    }
  },

  // ── Computed Helpers ─────────────────────────────────────────────────────────

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  
  pendingAssignments: () => {
    const { assignments, volunteerProfile } = get();
    if (!volunteerProfile) return assignments.filter((a) => a.status === 'pending');

    const currentSkills = volunteerProfile.skills || [];
    const currentDates = volunteerProfile.available_dates || [];

    return assignments.filter((a) => {
      if (a.status !== 'pending') return false;
      
      // Dynamic skill check
      const hasSkill = (a.event_required_skills || []).some(s => currentSkills.includes(s));
      // Dynamic date check
      const hasDate = currentDates.some(d => d >= a.event_date_start && d <= a.event_date_end);
      
      // Allow if it matches skills OR if it is a fallback (where we might not have skills)
      // but always respect the date availability
      return (hasSkill || a.is_fallback) && hasDate;
    });
  },
  
  acceptedAssignments: () => get().assignments.filter((a) => a.status === 'accepted'),
  pastAssignments: () => get().assignments.filter((a) => a.status === 'declined'),
}));
