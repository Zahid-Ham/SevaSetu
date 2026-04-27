import { create } from 'zustand';
import * as api from '../api/eventPredictionService';
import { ChatMessage, ChatRoom, AiMessage, ChatAnalysis } from '../api/eventPredictionService';
import { chatCache } from '../storage/chatCache';

interface ChatState {
  // Data
  messages: ChatMessage[];
  rooms: ChatRoom[];
  activeRoomId: string | null;
  loadingMessages: boolean;
  loadingRooms: boolean;
  sending: boolean;
  summary: any | null;
  loadingSummary: boolean;
  analysis: ChatAnalysis | null;
  loadingAnalysis: boolean;
  askAiAnswer: string | null;
  aiHistory: AiMessage[];
  loadingAskAi: boolean;
  loadingAiHistory: boolean;
  
  // Real-time
  socket: WebSocket | null;
  socketStatus: 'none' | 'connecting' | 'connected';
  connectingSocket: boolean;

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
  socketStatus: 'none',
  connectingSocket: false,

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
      
      // 4. STRICT RECONCILIATION: Combine Cache + Deltas + Current (prevent duplicates)
      set((state) => {
        const msgMap = new Map();
        [...cached, ...state.messages, ...deltas].forEach(m => {
          if (m.id) msgMap.set(m.id, m);
        });
        const combined = Array.from(msgMap.values()).sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        chatCache.saveMessages(roomId, combined);
        return { messages: combined };
      });
      
      // Also load AI history 
      get().loadAiHistory(roomId);
    } finally {
      set({ loadingMessages: false });
    }
  },

  connectWebSocket: (userId: string) => {
    const { socket, socketStatus, connectingSocket } = get();
    // 🛡️ STRICT SINGLETON CHECK
    if (socket || socketStatus !== 'none' || connectingSocket) {
      console.log(`[useChatStore] Skip connectWebSocket: already ${socketStatus}`);
      return;
    }
    
    set({ socketStatus: 'connecting', connectingSocket: true });

    // We use the same base IP as the REST API
    const baseUrl = api.BASE_URL; 
    if (!baseUrl || !userId) {
      console.warn('[useChatStore] Cannot connect WebSocket: baseUrl or userId missing', { baseUrl, userId });
      set({ socketStatus: 'none', connectingSocket: false });
      return;
    }

    const wsUrl = baseUrl.replace('http', 'ws') + `/chat/ws/chat/${userId}`;
    
    console.log(`[useChatStore] Connecting Singleton WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'new_message') {
          const newMsg = payload.data;
          const { activeRoomId, messages } = get();

          // Only append if it belongs to the current open room
          if (activeRoomId === newMsg.room_id) {
            set((state) => {
              // 🎯 ATOMIC RECONCILIATION
              const msgMap = new Map(state.messages.map(m => [m.id, m]));
              if (!msgMap.has(newMsg.id)) {
                msgMap.set(newMsg.id, newMsg);
                const updated = Array.from(msgMap.values()).sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                chatCache.saveMessages(newMsg.room_id, updated);
                return { messages: updated };
              }
              return state;
            });
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
        } else if (payload.type === 'message_deleted') {
          const { message_id, mode, deleted_by } = payload;
          const { activeRoomId, messages } = get();
          
          if (activeRoomId === payload.room_id) {
            set((state) => {
              let updated;
              if (mode === 'for_everyone') {
                updated = state.messages.map(m => 
                  m.id === message_id ? { ...m, deleted: true, text: 'This message was deleted' } : m
                );
              } else {
                // If it was deleted for 'me' or just by someone, update deleted_by
                updated = state.messages.map(m => 
                  m.id === message_id ? { ...m, deleted_by: deleted_by } : m
                );
              }
              if (activeRoomId) {
                chatCache.saveMessages(activeRoomId, updated);
              }
              return { messages: updated };
            });
          }
        }
      } catch (e) {
        console.warn('[useChatStore] WebSocket message error:', e);
      }
    };

    ws.onopen = () => {
      console.log('[useChatStore] WebSocket CONNECTED ✅');
      set({ socketStatus: 'connected', connectingSocket: false });
    };

    ws.onclose = () => {
      console.log('[useChatStore] WebSocket CLOSED ❌. Retrying in 5s...');
      set({ socket: null, socketStatus: 'none', connectingSocket: false });
      setTimeout(() => get().connectWebSocket(userId), 5000);
    };

    ws.onerror = (err) => {
      console.warn('[useChatStore] WebSocket ERROR:', err);
      set({ socketStatus: 'none', connectingSocket: false });
    };

    set({ socket: ws });
  },

  disconnectWebSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, socketStatus: 'none', connectingSocket: false });
    }
  },

  sendMessage: async (payload) => {
    // 1. ADD OPTIMISTIC MESSAGE INSTANTLY
    const tempId = 'send_' + Date.now();
    const tempMsg: ChatMessage = {
      id: tempId,
      sender_id: payload.sender_id,
      text: payload.text,
      type: payload.type || 'text',
      timestamp: new Date().toISOString(),
      file_url: payload.file_url,
      file_type: payload.file_type,
      file_name: payload.file_name,
      file_size: payload.file_size,
      file_public_id: payload.file_public_id,
      file_version: payload.file_version,
      file_extension: payload.file_extension,
      metadata: payload.metadata
    };

    set((state) => ({ 
      messages: [...state.messages, tempMsg],
      sending: true 
    }));

    try {
      const { room_id, message_id } = await api.sendMessage(payload);
      
      // 2. UPDATE TEMP ID WITH REAL ID
      // 🎯 CRITICAL: Check if the WebSocket already added it (race condition)
      set((state) => {
        const alreadyExists = state.messages.some(m => m.id === message_id);
        
        let updated;
        if (alreadyExists) {
          // If WebSocket already added it, just filter out our temp version
          updated = state.messages.filter(m => m.id !== tempId);
        } else {
          // Normal case: update tempId to the real one
          updated = state.messages.map((m) => 
            m.id === tempId ? { ...m, id: message_id } : m
          );
        }
        
        // Save to cache after ID is synced
        chatCache.saveMessages(room_id, updated);
        return { messages: updated };
      });
    } catch (e) {
      console.error('[useChatStore] Send message failed:', e);
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
