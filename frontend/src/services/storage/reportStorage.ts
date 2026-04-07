import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_SESSION_KEY = '@field_report_active';
const SYNC_QUEUE_KEY = '@field_report_sync_queue';

export interface SyncQueueItem {
  id: string;
  timestamp: string;
  reportType: string;
  sessionMeta: any;
  feed: any[];
  communityInputs: any[];
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  duration?: string;
}

export const reportStorage = {
  // --- Active Session (Ongoing Notebook) ---
  async saveActiveSession(data: { sessionMeta: any, feed: any[], communityInputs: any[], reportType: string }) {
    try {
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('[ReportStorage] Failed to save active session:', e);
    }
  },

  async loadActiveSession() {
    try {
      const data = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('[ReportStorage] Failed to load active session:', e);
      return null;
    }
  },

  async clearActiveSession() {
    try {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (e) {}
  },

  // --- Sync Queue (Completed Offline Reports) ---
  async addToSyncQueue(report: Omit<SyncQueueItem, 'status' | 'id'>) {
    try {
      const queue = await this.getSyncQueue();
      const newItem: SyncQueueItem = {
        ...report,
        id: 'REQ_' + Math.random().toString(36).substr(2, 9),
        status: 'pending'
      };
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([newItem, ...queue]));
      return newItem;
    } catch (e) {
      console.warn('[ReportStorage] Failed to add to queue:', e);
      return null;
    }
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async updateQueueItem(id: string, updates: Partial<SyncQueueItem>) {
    try {
      const queue = await this.getSyncQueue();
      const updated = queue.map(item => item.id === id ? { ...item, ...updates } : item);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async removeFromQueue(id: string) {
    try {
      const queue = await this.getSyncQueue();
      const filtered = queue.filter(item => item.id !== id);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {}
  }
};
