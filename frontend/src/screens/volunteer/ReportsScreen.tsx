import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { AppHeader } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';

type Report = {
  id: string;
  citizen_name: string;
  phone: string;
  location: string;
  issue_type: string;
  description: string;
  volunteer_id: string;
  created_at: string;
};

const ISSUE_COLORS: Record<string, string> = {
  'Water shortage': '#1976D2',
  'Electricity': '#F9A825',
  'Road damage': '#795548',
  'Sanitation': '#388E3C',
  'Medical': '#E53935',
};

const issueColor = (type: string) =>
  ISSUE_COLORS[type] ?? colors.primarySaffron;

export const ReportsScreen = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/reports`);
      const json = await res.json();
      if (json.success) {
        setReports(json.reports);
      } else {
        setError('Failed to fetch reports.');
      }
    } catch (e) {
      setError('Could not connect to server. Check your network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReports();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderItem = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: issueColor(item.issue_type) + '20' }]}>
          <Text style={[styles.badgeText, { color: issueColor(item.issue_type) }]}>
            {item.issue_type || 'Unknown'}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>

      <Text style={styles.nameText}>{item.citizen_name || 'Unknown Citizen'}</Text>

      <View style={styles.metaRow}>
        <Feather name="map-pin" size={13} color={colors.textSecondary} />
        <Text style={styles.metaText}>{item.location || '—'}</Text>
        <Feather name="phone" size={13} color={colors.textSecondary} style={{ marginLeft: spacing.md }} />
        <Text style={styles.metaText}>{item.phone || '—'}</Text>
      </View>

      <Text style={styles.descText} numberOfLines={2}>{item.description || '—'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Community Reports" />

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : error ? (
        <View style={styles.centred}>
          <Feather name="wifi-off" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchReports(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={reports.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} />}
          ListEmptyComponent={
            <View style={styles.centred}>
              <Feather name="inbox" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No reports submitted yet.</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.countText}>
              {reports.length} Report{reports.length !== 1 ? 's' : ''} Found
            </Text>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selected && (
                <>
                  <DetailRow icon="user" label="Citizen Name" value={selected.citizen_name} />
                  <DetailRow icon="phone" label="Phone" value={selected.phone} />
                  <DetailRow icon="map-pin" label="Location" value={selected.location} />
                  <DetailRow icon="alert-triangle" label="Issue Type" value={selected.issue_type} />
                  <DetailRow icon="file-text" label="Description" value={selected.description} />
                  <DetailRow icon="user-check" label="Volunteer ID" value={selected.volunteer_id} />
                  <DetailRow icon="clock" label="Submitted At" value={formatDate(selected.created_at)} />
                  <DetailRow icon="hash" label="Report ID" value={selected.id} />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Feather name={icon} size={16} color={colors.primaryGreen} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { ...typography.bodyText, marginTop: spacing.md, color: colors.textSecondary },
  errorText: { ...typography.bodyText, color: colors.error, textAlign: 'center', marginTop: spacing.md },
  retryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryText: { color: '#fff', ...typography.bodyText, fontWeight: '700' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...typography.bodyText, color: colors.textSecondary, marginTop: spacing.md },
  countText: {
    ...typography.captionText,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dateText: { ...typography.captionText, color: colors.textSecondary },
  nameText: { ...typography.headingSmall, fontSize: 16, marginBottom: spacing.sm, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  metaText: { ...typography.captionText, color: colors.textSecondary, marginLeft: 4 },
  descText: { ...typography.bodyText, color: colors.textSecondary, fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { ...typography.headingMedium, color: colors.textPrimary },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  detailIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryGreen + '15',
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  detailLabel: { ...typography.captionText, color: colors.textSecondary, marginBottom: 2, textTransform: 'uppercase', fontSize: 11 },
  detailValue: { ...typography.bodyText, color: colors.textPrimary },
});
