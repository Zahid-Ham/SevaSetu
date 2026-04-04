import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../api/eventPredictionService';

const CACHE_PREFIX = '@chat_cache_';

export const chatCache = {
  async saveMessages(roomId: string, messages: ChatMessage[]) {
    try {
      // Limit cache to last 100 messages to save space
      const toCache = messages.slice(-100);
      await AsyncStorage.setItem(`${CACHE_PREFIX}${roomId}`, JSON.stringify(toCache));
    } catch (e) {
      console.warn('[ChatCache] Save failed:', e);
    }
  },

  async loadMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      const data = await AsyncStorage.getItem(`${CACHE_PREFIX}${roomId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('[ChatCache] Load failed:', e);
      return [];
    }
  },

  async clearCache(roomId: string) {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${roomId}`);
    } catch (e) {}
  }
};
