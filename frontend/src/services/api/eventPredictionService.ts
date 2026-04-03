/**
 * eventPredictionService.ts
 * API client for all Event Prediction & Assignment endpoints.
 * Falls back to rich mock data if backend is unreachable (for demo resilience).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants'; // Added for dynamic IP

// ── Base URL ──────────────────────────────────────────────────────────────────
// 📱 Dynamic Base URL: use localhost for Web, extract LAN IP from Metro for physical devices
const getBaseUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:8000';
  
  // Extract host IP from Metro Bundler URI (e.g., 192.168.x.x:8081 -> 192.168.x.x:8000)
  const hostUri = Constants.expoConfig?.hostUri; 
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    console.log(`[API Config] Dynamic URL detected: http://${ip}:8000`);
    return `http://${ip}:8000`;
  }
  
  // Fallback to a common local IP if Metro URI is missing
  return 'http://192.168.0.102:8000'; 
};

const BASE_URL = getBaseUrl();

// Set to true if you are offline or the backend is down during the demo
const USE_MOCK_ONLY = false;

const TIMEOUT_MS = 30000; // Increased to 30 seconds for Deep Analysis reliability

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PredictedEvent {
  id: string;
  event_type: string;
  category: string;
  description: string;
  predicted_date_start: string;
  predicted_date_end: string;
  estimated_headcount: number;
  required_skills: string[];
  confidence_score: number;
  confidence_reason: string;
  area: string;
  suggested_govt_scheme: string;
  tier: 'high' | 'medium' | 'low';
  status: 'predicted' | 'confirmed' | 'dismissed' | 'stopped';
  accepted_count?: number;
  source?: string;
}

export interface VolunteerAssignment {
  id: string;
  volunteer_id: string;
  volunteer_name: string;
  volunteer_skills: string[];
  volunteer_area: string;
  match_score: number;
  score_breakdown: {
    skill_match_pct: number;
    availability_pct: number;
    area_match_pct: number;
    fatigue_buffer_pct: number;
  };
  event_id: string;
  event_type: string;
  event_description?: string;
  event_date_start: string;
  event_date_end: string;
  event_required_skills?: string[];  // Added
  status: 'pending' | 'accepted' | 'declined';
  is_fallback: boolean;
  created_at?: string;
}

export interface VolunteerProfile {
  volunteer_id: string;
  name: string;
  skills: string[];
  area: string;
  available_dates: string[];
  is_available: boolean;
  fatigue_score: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  assignment_id?: string;
  event_id?: string;
  read: boolean;
  created_at?: string;
}

export interface LiveMatch {
  event_id: string;
  event_type: string;
  event_date_start: string;
  event_date_end: string;
  event_required_skills: string[];
  area: string;
  category: string;
  estimated_headcount: number;
  accepted_count: number;
  volunteer_id: string;
  volunteer_name: string;
  volunteer_skills: string[];
  volunteer_area: string;
  matched_skills: string[];
  match_score: number;
  score_breakdown: {
    skill_match_pct: number;
    availability_pct: number;
    area_match_pct: number;
    fatigue_buffer_pct: number;
  };
  ai_reasoning: string;
  is_live_match: true;
}

export interface AiMessage {
  id: string;
  question: string;
  answer: string;
  user_id: string;
  timestamp: string;
  context_used: boolean;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  text: string;
  type: 'text' | 'event_attachment' | 'image' | 'pdf' | 'video';
  timestamp: string;
  metadata?: any;
  deleted?: boolean;
  deleted_by?: string[];
  // Media fields
  file_url?: string;
  file_type?: string;  // MIME type e.g. 'image/jpeg', 'application/pdf'
  file_name?: string;  // Original filename for display
  file_size?: number;  // Size in bytes
  file_public_id?: string; // Cloudinary public ID for signed URL generation
  file_version?: string;   // Cloudinary version (v17...)
  file_extension?: string; // Cloudinary format (pdf, jpg, etc.)
}

export interface ChatRoom {
  id: string;
  volunteer_id: string;
  supervisor_id: string;
  volunteer_name?: string;
  supervisor_name?: string;
  event_name?: string;
  event_id?: string;
  last_message: string;
  last_sender_id?: string;
  updated_at: string;
  participants: string[];
  unread_count?: number;
}

// ── Helper ────────────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  fallback?: T,
): Promise<T> {
  if (USE_MOCK_ONLY) {
    console.log(`[eventPredictionService] Mock mode: skipping ${path}`);
    return fallback as T;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error && err.name === 'AbortError'
      ? 'Request timed out'
      : err instanceof Error ? err.message : 'Unknown error';

    console.warn(`[eventPredictionService] API failure for ${path}: ${errorMsg}`);

    if (fallback !== undefined) {
      console.log(`[eventPredictionService] Using demo fallback for ${path}`);
      return fallback;
    }
    throw err;
  }
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function generatePredictions(area = 'Maharashtra'): Promise<PredictedEvent[]> {
  const data = await apiFetch<any>('/predictions/generate', {
    method: 'POST',
    body: JSON.stringify({ area }),
  }, { predictions: MOCK_PREDICTIONS });
  return data.predictions ?? MOCK_PREDICTIONS;
}

export async function fetchPredictions(): Promise<PredictedEvent[]> {
  try {
    const data = await apiFetch<any>('/predictions', undefined);
    // data.predictions could be [] which is valid — backend is reachable, DB is empty
    return Array.isArray(data.predictions) ? data.predictions : [];
  } catch (e) {
    // Only use mocks if the backend is physically unreachable (network down)
    console.warn('[eventPredictionService] Backend unreachable, using mocks:', e);
    return MOCK_PREDICTIONS;
  }
}

export async function seedPredictions(): Promise<PredictedEvent[]> {
  const data = await apiFetch<any>('/predictions/seed', { method: 'POST' }, { predictions: [] });
  return data.predictions ?? [];
}

export async function confirmPrediction(eventId: string, options?: {
  predicted_date_start?: string;
  predicted_date_end?: string;
  estimated_headcount?: number;
}): Promise<{ assignments: VolunteerAssignment[] }> {
  const data = await apiFetch<any>(`/predictions/${eventId}/confirm`, { 
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined
  }, { assignments: [] });
  return { assignments: data.assignments ?? [] };
}

export async function dismissPrediction(eventId: string): Promise<void> {
  await apiFetch(`/predictions/${eventId}/dismiss`, { method: 'POST' }, {});
}

export async function deletePrediction(eventId: string): Promise<void> {
  await apiFetch(`/predictions/${eventId}`, { method: 'DELETE' }, {});
}

export async function stopEvent(eventId: string): Promise<void> {
  await apiFetch(`/predictions/${eventId}/stop`, { method: 'POST' }, {});
}

export async function createManualEvent(payload: {
  event_type: string;
  category: string;
  description: string;
  area: string;
  predicted_date_start: string;
  predicted_date_end: string;
  estimated_headcount: number;
  required_skills: string[];
}): Promise<void> {
  await apiFetch('/events/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, {});
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function fetchAssignmentsForVolunteer(volunteerId: string): Promise<VolunteerAssignment[]> {
  try {
    const data = await apiFetch<any>(`/assignments/volunteer/${volunteerId}`, undefined);
    // Return real data even if it's an empty array — do NOT fall back to mocks
    return Array.isArray(data.assignments) ? data.assignments : [];
  } catch (e) {
    console.warn('[eventPredictionService] fetchAssignments backend unreachable, using mocks:', e);
    return MOCK_ASSIGNMENTS;
  }
}

export async function fetchAssignmentsForEvent(eventId: string): Promise<VolunteerAssignment[]> {
  const data = await apiFetch<any>(`/assignments/event/${eventId}`, undefined, { assignments: [] });
  return data.assignments ?? [];
}

export async function respondToAssignment(assignmentId: string, status: 'accepted' | 'declined'): Promise<void> {
  await apiFetch(`/assignments/${assignmentId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }, {});
}

// ── Volunteer Profile ─────────────────────────────────────────────────────────

export async function updateVolunteerProfile(profile: VolunteerProfile): Promise<void> {
  await apiFetch('/volunteers/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  }, {});
}

export async function fetchVolunteerProfile(volunteerId: string): Promise<VolunteerProfile | null> {
  const data = await apiFetch<any>(`/volunteers/profile/${volunteerId}`, undefined, { profile: null });
  return data.profile ?? null;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function fetchNotifications(volunteerId: string): Promise<AppNotification[]> {
  try {
    const data = await apiFetch<any>(`/notifications/${volunteerId}`, undefined);
    // Real empty notification list is valid — do not replace with mocks
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch (e) {
    console.warn('[eventPredictionService] Notifications backend unreachable, using mocks:', e);
    return MOCK_NOTIFICATIONS;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' }, {});
}

// ── Live Real-Time Matching ────────────────────────────────────────────────────

export async function fetchLiveMatches(volunteerId: string): Promise<LiveMatch[]> {
  try {
    const data = await apiFetch<any>(`/events/live/matching/${volunteerId}`, undefined);
    return Array.isArray(data.matches) ? data.matches : [];
  } catch (e) {
    console.warn('[eventPredictionService] fetchLiveMatches failed:', e);
    return [];
  }
}

export async function joinLiveMatch(payload: {
  event_id: string;
  volunteer_id: string;
  status: 'accepted' | 'declined';
  match_score?: number;
  score_breakdown?: any;
}): Promise<void> {
  await apiFetch('/events/live/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, {});
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function submitFeedback(payload: {
  event_id: string;
  volunteer_id?: string;
  coordinator_id?: string;
  assignment_quality_rating: number;
  comment?: string;
}): Promise<void> {
  await apiFetch('/events/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, {});
}

// ── Chat ──────────────────────────────────────────────────────────────────

export async function sendMessage(payload: {
  volunteer_id: string;
  supervisor_id: string;
  event_id?: string;
  sender_id: string;
  text: string;
  volunteer_name?: string;
  supervisor_name?: string;
  event_name?: string;
  type?: string;
  metadata?: any;
  // Media
  file_url?: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
  file_public_id?: string;
  file_version?: string;
  file_extension?: string;
}): Promise<{ room_id: string }> {
  return await apiFetch('/chat/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMessages(roomId: string, userId?: string): Promise<ChatMessage[]> {
  try {
    const queryParam = userId ? `?user_id=${userId}` : '';
    const data = await apiFetch<any>(`/chat/messages/${roomId}${queryParam}`, undefined);
    return Array.isArray(data.messages) ? data.messages : [];
  } catch (e) {
    console.warn('[eventPredictionService] fetchMessages failed:', e);
    return [];
  }
}

export async function fetchUserRooms(userId: string): Promise<ChatRoom[]> {
  try {
    const data = await apiFetch<any>(`/chat/rooms/${userId}`, undefined);
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch (e) {
    console.warn('[eventPredictionService] fetchUserRooms failed:', e);
    return [];
  }
}

export async function summarizeChat(messages: any[], contextEvent?: string, roomId?: string): Promise<string> {
  const data = await apiFetch<any>('/chat/summarize', {
    method: 'POST',
    body: JSON.stringify({ room_id: roomId, messages, context_event: contextEvent }),
  }, { summary: "Summary unavailable." });
  return data.summary;
}

export async function analyzeChat(roomId: string, eventName?: string): Promise<any> {
  console.log(`[API] analyzeChat: Triggering for room ${roomId}`);
  const data = await apiFetch<any>('/chat/analyze', {
    method: 'POST',
    body: JSON.stringify({ room_id: roomId, event_name: eventName }),
  });
  console.log('[API] analyzeChat result received:', { 
    success: !!data.analysis, 
    keys: data.analysis ? Object.keys(data.analysis) : 'NONE' 
  });
  return data.analysis;
}

export async function askAi(roomId: string, question: string, userId: string, eventName?: string): Promise<{ answer: string; context_used: boolean }> {
  return await apiFetch<any>('/chat/ask', {
    method: 'POST',
    body: JSON.stringify({ room_id: roomId, question, user_id: userId, event_name: eventName }),
  });
}

export async function fetchAiHistory(roomId: string): Promise<AiMessage[]> {
  try {
    const data = await apiFetch<any>(`/chat/ask/history/${roomId}`, undefined);
    return Array.isArray(data.history) ? data.history : [];
  } catch (e) {
    console.warn('[eventPredictionService] fetchAiHistory failed:', e);
    return [];
  }
}

export async function clearAiHistory(roomId: string): Promise<boolean> {
  try {
    const data = await apiFetch<any>(`/chat/ask/history/${roomId}`, {
      method: 'DELETE',
    });
    return data.success === true;
  } catch (e) {
    console.warn('[eventPredictionService] clearAiHistory failed:', e);
    return false;
  }
}

export async function markRoomRead(roomId: string, userId: string): Promise<void> {
  await apiFetch(`/chat/read/${roomId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'POST',
  }, {});
}

export async function deleteMessage(
  roomId: string,
  messageId: string,
  mode: 'for_me' | 'for_everyone',
  userId: string
): Promise<void> {
  await apiFetch(
    `/chat/messages/${roomId}/${messageId}?mode=${mode}&user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
    {}
  );
}

// ── Mock Data (Demo Fallback) ──────────────────────────────────────────────────

const today = new Date();
const addDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().split('T')[0];

export const MOCK_PREDICTIONS: PredictedEvent[] = [
  {
    id: 'pred_1',
    event_type: 'Clean Water Camp',
    category: 'Water',
    description: 'Seasonal water scarcity and 3 recent community complaints indicate high demand for a distribution camp. Similar events had 89% positive impact last April.',
    predicted_date_start: addDays(8),
    predicted_date_end: addDays(11),
    estimated_headcount: 18,
    required_skills: ['logistics', 'driving', 'crowd_management', 'documentation'],
    confidence_score: 0.91,
    confidence_reason: 'Strong seasonal pattern + 4 recent water complaints in this area.',
    area: 'Pune, Maharashtra',
    suggested_govt_scheme: 'Jal Jeevan Mission',
    tier: 'high',
    status: 'predicted',
  },
  {
    id: 'pred_2',
    event_type: 'Health Screening Camp',
    category: 'Health',
    description: 'Community reports of respiratory issues and fever signal a preventive health camp. Historical data confirms a similar surge in this period annually.',
    predicted_date_start: addDays(14),
    predicted_date_end: addDays(17),
    estimated_headcount: 25,
    required_skills: ['first_aid', 'medical', 'documentation', 'counseling'],
    confidence_score: 0.87,
    confidence_reason: 'Recurring annual health pattern, high match with current community data.',
    area: 'Nashik, Maharashtra',
    suggested_govt_scheme: 'Ayushman Bharat',
    tier: 'high',
    status: 'predicted',
  },
  {
    id: 'pred_3',
    event_type: 'Food Distribution Drive',
    category: 'Sanitation',
    description: 'End-of-month food scarcity patterns in low-income clusters detected. Past drives in similar windows had 95% volunteer attendance.',
    predicted_date_start: addDays(22),
    predicted_date_end: addDays(24),
    estimated_headcount: 30,
    required_skills: ['logistics', 'cooking', 'crowd_management', 'driving'],
    confidence_score: 0.79,
    confidence_reason: 'Periodic food scarcity data + strong volunteer pool in area.',
    area: 'Mumbai, Maharashtra',
    suggested_govt_scheme: 'PM Garib Kalyan Anna Yojana',
    tier: 'medium',
    status: 'predicted',
  },
  {
    id: 'pred_4',
    event_type: 'Road Survey Camp',
    category: 'Infrastructure',
    description: 'Post-monsoon road damage complaints rose 40% in the last 2 weeks. Volunteer-led survey needed before municipal response.',
    predicted_date_start: addDays(30),
    predicted_date_end: addDays(33),
    estimated_headcount: 12,
    required_skills: ['construction', 'documentation', 'logistics'],
    confidence_score: 0.68,
    confidence_reason: 'Infrastructure complaints trending up; timing is still uncertain.',
    area: 'Nagpur, Maharashtra',
    suggested_govt_scheme: 'PMGSY',
    tier: 'medium',
    status: 'confirmed',
  },
  {
    id: 'pred_5',
    event_type: 'Digital Literacy Workshop',
    category: 'Education',
    description: 'Government digital scheme enrollment deadlines approaching — community members need help with online registrations for PM-KISAN and Aadhaar updates.',
    predicted_date_start: addDays(45),
    predicted_date_end: addDays(47),
    estimated_headcount: 10,
    required_skills: ['teaching', 'documentation', 'counseling'],
    confidence_score: 0.62,
    confidence_reason: 'Moderate signal — depends on scheme deadline which can shift.',
    area: 'Aurangabad, Maharashtra',
    suggested_govt_scheme: 'Digital India',
    tier: 'low',
    status: 'predicted',
  },
];

export const MOCK_ASSIGNMENTS: VolunteerAssignment[] = [
  {
    id: 'asgn_1',
    volunteer_id: 'vol_anita',
    volunteer_name: 'Anita Sharma',
    volunteer_skills: ['first_aid', 'medical', 'documentation'],
    volunteer_area: 'Nashik, Maharashtra',
    match_score: 0.89,
    score_breakdown: { skill_match_pct: 75, availability_pct: 100, area_match_pct: 100, fatigue_buffer_pct: 90 },
    event_id: 'pred_2',
    event_type: 'Health Screening Camp',
    event_date_start: addDays(14),
    event_date_end: addDays(17),
    status: 'pending',
    is_fallback: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'asgn_2',
    volunteer_id: 'vol_anita',
    volunteer_name: 'Anita Sharma',
    volunteer_skills: ['logistics'],
    volunteer_area: 'Pune, Maharashtra',
    match_score: 0.76,
    score_breakdown: { skill_match_pct: 50, availability_pct: 100, area_match_pct: 70, fatigue_buffer_pct: 90 },
    event_id: 'pred_1',
    event_type: 'Clean Water Camp',
    event_date_start: addDays(8),
    event_date_end: addDays(11),
    status: 'accepted',
    is_fallback: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'asgn_3',
    volunteer_id: 'vol_anita',
    volunteer_name: 'Anita Sharma',
    volunteer_skills: ['teaching', 'counseling'],
    volunteer_area: 'Aurangabad, Maharashtra',
    match_score: 0.61,
    score_breakdown: { skill_match_pct: 67, availability_pct: 50, area_match_pct: 50, fatigue_buffer_pct: 80 },
    event_id: 'pred_5',
    event_type: 'Digital Literacy Workshop',
    event_date_start: addDays(45),
    event_date_end: addDays(47),
    status: 'declined',
    is_fallback: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    type: 'assignment',
    title: 'New Assignment: Health Screening Camp',
    body: 'You match 3/4 required skills for an event on ' + addDays(14) + ' in Nashik. Accept or decline within 24 hours.',
    assignment_id: 'asgn_1',
    event_id: 'pred_2',
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif_2',
    type: 'confirmed',
    title: 'Assignment Accepted ✅',
    body: 'Your slot for the Clean Water Camp on ' + addDays(8) + ' is confirmed. See you there!',
    assignment_id: 'asgn_2',
    event_id: 'pred_1',
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];
