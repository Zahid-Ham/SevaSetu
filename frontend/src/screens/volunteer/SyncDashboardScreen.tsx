import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppHeader, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { reportStorage, SyncQueueItem } from '../../services/storage/reportStorage';
import { API_BASE_URL } from '../../config/apiConfig';
import { useNavigation } from '@react-navigation/native';

export const SyncDashboardScreen = () => {
  const navigation = useNavigation();
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);
    const items = await reportStorage.getSyncQueue();
    setQueue(items);
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSyncItem = async (item: SyncQueueItem) => {
    setSyncingId(item.id);
    try {
      const formData = new FormData();
      formData.append('session_details', JSON.stringify(item.sessionMeta));
      formData.append('feed_items', JSON.stringify(item.feed.map(i => ({
        ...i,
        localUri: i.localUri ? 'has_file' : null
      }))));
      formData.append('community_inputs', JSON.stringify(item.communityInputs));

      // Attach Files
      let fileIndex = 0;
      for (const f of item.feed) {
        if (f.localUri) {
          const filename = f.localUri.split('/').pop() || `file_${fileIndex}`;
          // @ts-ignore
          formData.append('files', { uri: f.localUri, name: `${f.type}_${fileIndex}_${filename}`, type: 'application/octet-stream' });
          fileIndex++;
        }
      }

      const res = await fetch(`${API_BASE_URL}/field-report/finalize`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await res.json();
      if (data.success) {
        await reportStorage.removeFromQueue(item.id);
        Alert.alert('Success', 'Report synced successfully!');
        loadQueue();
      } else {
        throw new Error(data.detail || 'Sync failed');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
      await reportStorage.updateQueueItem(item.id, { status: 'failed', error: err.message });
    } finally {
      setSyncingId(null);
    }
  };

  const renderItem = ({ item }: { item: SyncQueueItem }) => (
    <View style={[globalStyles.card, styles.itemCard]}>
      <View style={styles.itemHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.reportType}</Text>
        </View>
        <Text style={styles.dateText}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </View>
      
      <Text style={typography.headingSmall}>{item.sessionMeta.title || 'Untitled Session'}</Text>
      <Text style={styles.statsText}>{item.feed.length} items • {item.communityInputs.length} community inputs</Text>
      
      {item.status === 'failed' && (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{item.error || 'Connection failed'}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.syncBtn, item.status === 'failed' && { backgroundColor: colors.error }]}
        onPress={() => handleSyncItem(item)}
        disabled={!!syncingId}
      >
        {syncingId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.syncBtnText}>
              {item.status === 'failed' ? 'Retry Sync' : 'Sync Now'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Sync Dashboard" showBack={true} onBackPress={() => navigation.goBack()} />
      
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
        </View>
      ) : queue.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="cloud-off" size={64} color={colors.textSecondary + '20'} />
          <Text style={styles.emptyTitle}>No pending reports</Text>
          <Text style={styles.emptySubtitle}>All your field sessions are synced to the cloud.</Text>
          <PrimaryButton title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 24 }} />
        </View>
      ) : (
        <FlatList
          data={queue}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={() => (
             <View style={styles.header}>
               <Text style={typography.bodyText}>You have {queue.length} reports waiting to be uploaded.</Text>
             </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { marginBottom: 16 },
  itemCard: { marginBottom: 16, padding: spacing.md },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { backgroundColor: colors.primaryGreen + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, color: colors.primaryGreen, fontWeight: '700' },
  dateText: { fontSize: 10, color: colors.textSecondary },
  statsText: { ...typography.captionText, marginTop: 4, marginBottom: 12 },
  syncBtn: { 
    flexDirection: 'row', 
    backgroundColor: colors.primaryGreen, 
    padding: 12, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 8
  },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.error + '10', padding: 8, borderRadius: 6, marginBottom: 12 },
  errorText: { fontSize: 11, color: colors.error, flex: 1 },
  emptyTitle: { ...typography.headingMedium, marginTop: 16 },
  emptySubtitle: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
});
