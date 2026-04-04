import { create } from 'zustand';
import * as api from '../api/eventPredictionService';
import { ChatMessage, ChatRoom, AiMessage } from '../api/eventPredictionService';
import { chatCache } from '../storage/chatCache';

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
  analysis: any | null;
  loadingAnalysis: boolean;
  askAiAnswer: string | null;
  aiHistory: AiMessage[];
  loadingAskAi: boolean;
  loadingAiHistory: boolean;
  
  // Real-time
  socket: WebSocket | null;

  // Actions
  loadRooms: (userId: string) => Promise<void>;
  loadMessages: (roomId: string, userId?: string) => Promise<void>;
  sendMessage: (payload: any) => Promise<void>;
  
  // Real-time WebSocket
  connectWebSocket: (userId: string) => void;
  disconnectWebSocket: () => void;
  
  // Message Management
  markRoomRead: (roomId: string, userId: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string, mode: 'for_me' | 'for_everyone', userId: string) => Promise<void>;
  
  // AI Integration
  generateSummary: (roomId: string, eventName?: string) => Promise<void>;
  analyzeChat: (roomId: string, eventName?: string) => Promise<void>;
  askAi: (roomId: string, question: string, userId: string, eventName?: string) => Promise<void>;
  loadAiHistory: (roomId: string) => Promise<void>;
  clearAiHistory: (roomId: string) => Promise<void>;
  
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
  analysis: null,
  loadingAnalysis: false,
  askAiAnswer: null,
  aiHistory: [],
  loadingAskAi: false,
  loadingAiHistory: false,
  socket: null,

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
      // 1. First, load from Cache for instant UI
      const cached = await chatCache.loadMessages(roomId);
      set({ messages: cached });

      // 2. Determine when we last saw a message
      const lastTs = cached.length > 0 ? cached[cached.length - 1].timestamp : undefined;

      // 3. Fetch only Deltas (New messages since the cache)
      const deltas = await api.fetchMessages(roomId, userId, lastTs);
      
      if (deltas.length > 0) {
        // Append deltas to cached messages
        const updated = [...cached, ...deltas];
        set({ messages: updated });
        // Update Cache
        await chatCache.saveMessages(roomId, updated);
      }
      
      // Also load AI history 
      get().loadAiHistory(roomId);
    } finally {
      set({ loadingMessages: false });
    }
  },

  connectWebSocket: (userId: string) => {
    // Avoid double connection
    if (get().socket) return;

    // We use the same base IP as the REST API
    const baseUrl = api.BASE_URL; // Assuming it's exported or accessible
    const wsUrl = baseUrl.replace('http', 'ws') + `/chat/ws/chat/${userId}`;
    
    console.log(`[useChatStore] Connecting WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'new_message') {
          const newMsg = payload.data;
          const { activeRoomId, messages } = get();

          // Only append if it belongs to the current open room
          if (activeRoomId === newMsg.room_id) {
            // Check if already exists (prevent duplicates from REST + WS racing)
            if (!messages.find(m => m.id === newMsg.id)) {
              const updated = [...messages, newMsg];
              set({ messages: updated });
              if (activeRoomId) {
                // Also update cache in background
                chatCache.saveMessages(activeRoomId, updated);
              }
            }
          } else {
            // 🏷️ If it's for another room, update the room list LIVE
            set((state) => {
              const updatedRooms = state.rooms.map(r => {
                if (r.id === newMsg.room_id) {
                  return { 
                    ...r, 
                    unread_count: (r.unread_count || 0) + 1, 
                    last_message: newMsg.type === 'text' ? newMsg.text : `${newMsg.type === 'image' ? '📷 Image' : '📄 Document'}`,
                    updated_at: newMsg.timestamp
                  };
                }
                return r;
              });

              // Re-sort: Move the updated room to the top
              updatedRooms.sort((a, b) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );

              return { rooms: updatedRooms };
            });
          }
        }
      } catch (e) {
        console.warn('[useChatStore] WebSocket message error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[useChatStore] WebSocket closed. Retrying in 5s...');
      set({ socket: null });
      setTimeout(() => get().connectWebSocket(userId), 5000);
    };

    set({ socket: ws });
  },

  disconnectWebSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null });
    }
  },

  sendMessage: async (payload) => {
    set({ sending: true });
    try {
      const { room_id } = await api.sendMessage(payload);
      
      // OPTIMISTIC UI: Add the message locally without waiting for WebSocket
      // This is especially important since WS connection might be rejected/flaky.
      const tempMsg: ChatMessage = {
        id: 'send_' + Date.now(), // Temp ID until real sync
        sender_id: payload.sender_id,
        text: payload.text,
        type: payload.type || 'text',
        timestamp: new Date().toISOString(),
        file_url: payload.file_url,
        file_type: payload.file_type,
        file_name: payload.file_name,
        file_size: payload.file_size
      };

      set((state) => {
        const updated = [...state.messages, tempMsg];
        chatCache.saveMessages(room_id, updated);
        return { messages: updated };
      });
    } finally {
      set({ sending: false });
    }
  },

  generateSummary: async (roomId: string, eventName?: string) => {
    set({ loadingSummary: true, summary: null });
    try {
      const room = get().rooms.find(r => r.id === roomId);
      const messages = get().messages.map(m => ({
        role: m.sender_id === room?.supervisor_id ? 'supervisor' : 'volunteer',
        content: m.text,
        timestamp: m.timestamp
      }));
      const summaryText = await api.summarizeChat(messages, eventName, roomId);
      set({ summary: summaryText });
    } finally {
      set({ loadingSummary: false });
    }
  },

  analyzeChat: async (roomId: string, eventName?: string) => {
    set({ loadingAnalysis: true, analysis: null });
    try {
      const analysis = await api.analyzeChat(roomId, eventName);
      set({ analysis });
    } finally {
      set({ loadingAnalysis: false });
    }
  },

  askAi: async (roomId: string, question: string, userId: string, eventName?: string) => {
    set({ loadingAskAi: true });
    try {
      const result = await api.askAi(roomId, question, userId, eventName);
      const newInteraction: AiMessage = {
        id: Math.random().toString(36).substr(2, 9),
        question,
        answer: result.answer,
        user_id: userId,
        timestamp: new Date().toISOString(),
        context_used: result.context_used
      };
      set((state) => ({ 
        aiHistory: [...state.aiHistory, newInteraction],
        askAiAnswer: result.answer 
      }));
    } finally {
      set({ loadingAskAi: false });
    }
  },

  loadAiHistory: async (roomId: string) => {
    set({ loadingAiHistory: true });
    try {
      const history = await api.fetchAiHistory(roomId);
      set({ aiHistory: history });
    } finally {
      set({ loadingAiHistory: false });
    }
  },

  clearAiHistory: async (roomId: string) => {
    try {
      const success = await api.clearAiHistory(roomId);
      if (success) {
        set({ aiHistory: [], askAiAnswer: null });
      }
    } catch (e) {
      console.warn('[useChatStore] clearAiHistory failed:', e);
    }
  },

  markRoomRead: async (roomId: string, userId: string) => {
    try {
      await api.markRoomRead(roomId, userId);
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
      if (mode === 'for_everyone') {
        set((state) => ({
          messages: state.messages.map((m) => 
            m.id === messageId ? { ...m, deleted: true, text: 'This message was deleted' } : m
          )
        }));
      } else {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== messageId)
        }));
      }
      // Update cache after deletion
      chatCache.saveMessages(roomId, get().messages);
    } catch (e) {
      console.error('[useChatStore] deleteMessage error:', e);
    }
  },

  resetChat: () => {
    set({ 
      messages: [], 
      activeRoomId: null, 
      loadingSummary: false,
      analysis: null,
      loadingAnalysis: false,
      askAiAnswer: null,
      loadingAskAi: false
    });
  },
}));
