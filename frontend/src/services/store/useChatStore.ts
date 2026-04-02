import { create } from 'zustand';
import * as api from '../api/eventPredictionService';
import { ChatMessage, ChatRoom } from '../api/eventPredictionService';

interface ChatState {
  // Data
  messages: ChatMessage[];
  rooms: ChatRoom[];
  activeRoomId: string | null;
  loadingMessages: boolean;
  loadingRooms: boolean;
  sending: boolean;
  summary: string | null;
  loadingSummary: boolean;

  // Actions
  loadRooms: (userId: string) => Promise<void>;
  loadMessages: (roomId: string, userId?: string) => Promise<void>;
  sendMessage: (payload: {
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
  }) => Promise<void>;
  
  // Real-time Simulation (Polling)
  startPolling: (roomId: string, userId?: string) => () => void; // Returns cleanup function
  
  // Message Management
  markRoomRead: (roomId: string, userId: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string, mode: 'for_me' | 'for_everyone', userId: string) => Promise<void>;
  
  // AI Integration
  generateSummary: (roomId: string, eventName?: string) => Promise<void>;
  
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  rooms: [],
  activeRoomId: null,
  loadingMessages: false,
  loadingRooms: false,
  sending: false,
  summary: null,
  loadingSummary: false,

  loadRooms: async (userId: string) => {
    set({ loadingRooms: true });
    try {
      const rooms = await api.fetchUserRooms(userId);
      set({ rooms });
    } finally {
      set({ loadingRooms: false });
    }
  },

  loadMessages: async (roomId: string, userId?: string) => {
    set({ loadingMessages: true, activeRoomId: roomId });
    try {
      const messages = await api.fetchMessages(roomId, userId);
      set({ messages });
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (payload) => {
    set({ sending: true });
    try {
      const { room_id } = await api.sendMessage(payload);
      // Let backend handle room metadata update via payload
      const msgs = await api.fetchMessages(room_id);
      set({ messages: msgs, activeRoomId: room_id });
    } finally {
      set({ sending: false });
    }
  },

  startPolling: (roomId: string, userId?: string) => {
    console.log(`[useChatStore] Starting polling for room: ${roomId}`);
    const interval = setInterval(async () => {
      // Only fetch if this is still the active room
      if (get().activeRoomId === roomId) {
        try {
          const msgs = await api.fetchMessages(roomId, userId);
          // Only update if count changed (basic diffing)
          if (msgs.length !== get().messages.length) {
            set({ messages: msgs });
          }
        } catch (e) {
          console.warn('[useChatStore] Polling error:', e);
        }
      }
    }, 3000); // 3 seconds interval

    return () => {
      console.log(`[useChatStore] Cleaning up polling for room: ${roomId}`);
      clearInterval(interval);
    };
  },

  generateSummary: async (roomId: string, eventName?: string) => {
    set({ loadingSummary: true, summary: null });
    try {
      const messages = get().messages;
      const summaryText = await api.summarizeChat(messages, eventName);
      set({ summary: summaryText });
    } finally {
      set({ loadingSummary: false });
    }
  },

  markRoomRead: async (roomId: string, userId: string) => {
    try {
      await api.markRoomRead(roomId, userId);
      // Immediately clear unread count in locally cached rooms
      set((state) => ({
        rooms: state.rooms.map((r) => 
          r.id === roomId ? { ...r, unread_count: 0 } : r
        )
      }));
    } catch (e) {
      console.warn('[useChatStore] markRoomRead error:', e);
    }
  },

  deleteMessage: async (roomId: string, messageId: string, mode: 'for_me' | 'for_everyone', userId: string) => {
    try {
      await api.deleteMessage(roomId, messageId, mode, userId);
      // Immediately update local messages state
      if (mode === 'for_everyone') {
        set((state) => ({
          messages: state.messages.map((m) => 
            m.id === messageId ? { ...m, deleted: true, text: 'This message was deleted' } : m
          )
        }));
      } else {
        // for_me: simply remove from local stream for this user
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== messageId)
        }));
      }
    } catch (e) {
      console.error('[useChatStore] deleteMessage error:', e);
    }
  },

  resetChat: () => {
    set({ 
      messages: [], 
      activeRoomId: null, 
      summary: null,
      loadingSummary: false 
    });
  },
}));
