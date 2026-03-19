import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Image, Alert, Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { AppHeader } from '../../components';
import { FullImageViewer } from '../../components/common/FullImageViewer';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';
import { ShimmerCardList } from '../../components/common/SkeletonCard';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

type Report = {
  id: string;
  volunteer_id: string;
  created_at: string;
  
  citizen_name?: string;
  phone?: string;
  precise_location?: string;
  gps_coordinates?: string;
  primary_category?: string;
  sub_category?: string;
  problem_status?: string;
  duration_of_problem?: string;
  urgency_level?: string;
  severity_score?: number;
  population_affected?: number;
  vulnerability_flag?: string;
  secondary_impact?: string;
  key_complaints?: string[];
  sentiment?: string;
  key_quote?: string;
  description?: string;
  auto_category?: string;
  report_source?: string;
  
  // Legacy
  location?: string;
  issue_type?: string;
  photo_url?: string;
  audio_url?: string;
};

const CATEGORIES = ['All', 'Water', 'Sanitation', 'Infrastructure', 'Health', 'Education', 'Safety', 'Other'];

const ISSUE_COLORS: Record<string, string> = {
  'Water': '#1976D2',
  'Sanitation': '#388E3C',
  'Infrastructure': '#8E24AA',
  'Health': '#E53935',
  'Education': '#F57C00',
  'Safety': '#D32F2F',
  'Electricity': '#F9A825',
  'Road': '#795548',
};

const issueColor = (type?: string) => type ? (ISSUE_COLORS[type] || ISSUE_COLORS[type.split(' ')[0]] || colors.primarySaffron) : colors.primarySaffron;

const formatDate = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

import { Audio } from 'expo-av';

const AudioPlayer = ({ url }: { url: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const fullUrl = url.startsWith('file://') ? url : API_BASE_URL + url;
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
        });
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (e) {
      console.log('Error playing sound', e);
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryGreen + '40', marginTop: spacing.xs, marginBottom: spacing.md }} onPress={playSound}>
      <Feather name={isPlaying ? "pause-circle" : "play-circle"} size={24} color={colors.primaryGreen} />
      <Text style={{ ...typography.bodyText, color: colors.primaryGreen, marginLeft: spacing.sm, fontWeight: '700' }}>
        {isPlaying ? "Playing Voice Note..." : "Play Voice Note"}
      </Text>
    </TouchableOpacity>
  );
};

export const ReportsScreen = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Full Image Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%', '85%'], []);

  const fetchReports = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/reports`);
      const json = await res.json();
      if (json.success) setReports(json.reports);
      else setError('Failed to fetch reports.');
    } catch (e) { setError('Could not connect to server.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchReports(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchReports(); };

  const handleDeleteReport = async (id: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This will also remove any audio/photo attachments from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/reports/${id}`, { method: 'DELETE' });
              const data = await res.json();
              if (data.success) {
                closeSheet();
                fetchReports();
              } else {
                Alert.alert('Error', data.detail || 'Failed to delete');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting');
            }
          }
        }
      ]
    );
  };

  const closeSheet = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => setSelected(null), 300);
  };

  const filteredReports = useMemo(() => {
    if (selectedCategory === 'All') return reports;
    return reports.filter(r => 
      r.auto_category === selectedCategory || 
      r.primary_category === selectedCategory || 
      r.issue_type === selectedCategory
    );
  }, [reports, selectedCategory]);

  const renderItem = ({ item }: { item: Report }) => {
    const cat = item.auto_category || item.primary_category || item.issue_type || 'Unknown';
    return (
      <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); bottomSheetRef.current?.expand(); }}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: issueColor(cat) + '20' }]}>
            <Text style={[styles.badgeText, { color: issueColor(cat) }]}>{cat}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.nameText}>{item.citizen_name || 'Unknown Citizen'}</Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{item.precise_location || item.location || '—'}</Text>
          {item.severity_score && (
            <View style={styles.severityWrap}>
              <Feather name="alert-circle" size={13} color={colors.error} />
              <Text style={[styles.metaText, { color: colors.error }]}>Severity {item.severity_score}/10</Text>
            </View>
          )}
        </View>
        <Text style={styles.descText} numberOfLines={2}>{item.description || item.key_complaints?.join(', ') || '—'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Community Reports" />
      
      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.filterPill, selectedCategory === cat && styles.filterPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.skeletonContainer}><ShimmerCardList count={4} /></View>
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
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={filteredReports.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centred}>
              <Feather name="inbox" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No reports found for "{selectedCategory}".</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.countText}>{filteredReports.length} Report{filteredReports.length !== 1 ? 's' : ''}</Text>
          }
        />
      )}

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={closeSheet}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <TouchableOpacity onPress={closeSheet}><Feather name="x" size={24} color={colors.textPrimary} /></TouchableOpacity>
          </View>
          {selected && (
            <>
              {/* Who & Where */}
              <SectionBreak title="1. Who & Where" />
              <DetailRow icon="user" label="Citizen Name" value={selected.citizen_name || 'Anonymous'} />
              <DetailRow icon="phone" label="Phone" value={selected.phone || 'N/A'} />
              <DetailRow icon="map-pin" label="Location" value={selected.precise_location || selected.location || 'N/A'} />
              {selected.gps_coordinates && <DetailRow icon="navigation" label="GPS" value={selected.gps_coordinates} />}

              {/* Problem */}
              <SectionBreak title="2. The Problem" />
              <DetailRow icon="grid" label="Category" value={selected.primary_category || selected.auto_category || selected.issue_type || 'Uncategorized'} />
              {selected.sub_category && <DetailRow icon="corner-down-right" label="Sub Category" value={selected.sub_category} />}
              <DetailRow icon="alert-triangle" label="Urgency" value={selected.urgency_level || 'Moderate'} />
              <DetailRow icon="clock" label="Duration" value={selected.duration_of_problem} />
              
              {/* Qualitative & Impact */}
              <SectionBreak title="3. Impact & Feedback" />
              <DetailRow icon="activity" label="Severity Score" value={selected.severity_score !== undefined ? `${selected.severity_score}/10` : '—'} />
              <DetailRow icon="users" label="Affected Pop." value={selected.population_affected?.toString()} />
              <DetailRow icon="message-circle" label="Key Complaints" value={selected.key_complaints?.join(', ')} />
              <DetailRow icon="smile" label="Sentiment" value={selected.sentiment} />
              <DetailRow icon="file-text" label="Description" value={selected.description || '—'} />

              {/* Attachments */}
              {(selected.photo_url || selected.audio_url) && (
                <SectionBreak title="4. Attachments" />
              )}
              {selected.photo_url && (
                selected.photo_url.toLowerCase().endsWith('.pdf') ? (
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryGreen + '40', marginBottom: spacing.md }}
                    onPress={() => {
                       const fullUrl = selected.photo_url!.startsWith('file://') ? selected.photo_url! : API_BASE_URL + selected.photo_url;
                       import('react-native').then(rn => rn.Linking.openURL(fullUrl));
                    }}
                  >
                    <Feather name="file-text" size={24} color={colors.primaryGreen} />
                    <Text style={{ ...typography.bodyText, color: colors.primaryGreen, marginLeft: spacing.sm, fontWeight: '700' }}>View PDF Document</Text>
                    <Feather name="external-link" size={16} color={colors.primaryGreen} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={{ marginBottom: spacing.md }}
                    onPress={() => {
                      setViewerUri(selected.photo_url!.startsWith('file://') ? selected.photo_url! : API_BASE_URL + selected.photo_url);
                      setViewerVisible(true);
                    }}
                  >
                    <Image source={{ uri: selected.photo_url.startsWith('file://') ? selected.photo_url : API_BASE_URL + selected.photo_url }} style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: colors.textSecondary + '20' }} resizeMode="cover" />
                    <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                      <Feather name="maximize" size={16} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                )
              )}
              {selected.audio_url && (
                <AudioPlayer url={selected.audio_url} />
              )}

              {/* System Info */}
              <SectionBreak title="5. System Info" />
              <DetailRow icon="hash" label="Report ID" value={selected.id} />
              <DetailRow icon="user-check" label="Volunteer" value={selected.volunteer_id} />
              <DetailRow icon="server" label="Source" value={selected.report_source || 'Unknown'} />
              <DetailRow icon="calendar" label="Created At" value={formatDate(selected.created_at)} />

              <TouchableOpacity 
                style={{ 
                  marginTop: spacing.xl, 
                  backgroundColor: colors.error + '15', 
                  padding: spacing.md, 
                  borderRadius: 12, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.error + '40'
                }}
                onPress={() => handleDeleteReport(selected.id)}
              >
                <Feather name="trash-2" size={20} color={colors.error} />
                <Text style={{ ...typography.bodyText, color: colors.error, marginLeft: spacing.sm, fontWeight: '700' }}>Delete Report Entry</Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      <FullImageViewer 
        visible={viewerVisible} 
        imageUri={viewerUri} 
        onClose={() => setViewerVisible(false)} 
      />
    </View>
  );
};

const SectionBreak = ({ title }: { title: string }) => (
  <View style={{ marginTop: spacing.md, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', paddingBottom: 4 }}>
    <Text style={{ ...typography.captionText, color: colors.primaryGreen, fontWeight: '700', textTransform: 'uppercase' }}>{title}</Text>
  </View>
);

const DetailRow = ({ icon, label, value }: { icon: any; label: string; value?: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}><Feather name={icon} size={16} color={colors.primaryGreen} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  skeletonContainer: { flex: 1, padding: spacing.lg },
  errorText: { ...typography.bodyText, color: colors.error, textAlign: 'center', marginTop: spacing.md },
  retryBtn: { marginTop: spacing.lg, backgroundColor: colors.primaryGreen, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  
  filterContainer: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '10' },
  filterScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.textSecondary + '30' },
  filterPillActive: { backgroundColor: colors.primarySaffron, borderColor: colors.primarySaffron },
  filterText: { ...typography.bodyText, fontSize: 13, color: colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...typography.bodyText, color: colors.textSecondary, marginTop: spacing.md },
  countText: { ...typography.captionText, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', marginBottom: spacing.md },
  
  card: { backgroundColor: colors.cardBackground, borderRadius: 14, padding: spacing.lg, marginBottom: spacing.md, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dateText: { ...typography.captionText, color: colors.textSecondary },
  nameText: { ...typography.headingSmall, fontSize: 16, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  metaText: { ...typography.captionText, color: colors.textSecondary, marginLeft: 4 },
  severityWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md },
  descText: { ...typography.bodyText, color: colors.textSecondary, fontSize: 13 },
  
  sheetBackground: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: colors.textSecondary + '40', width: 40, height: 4, borderRadius: 2 },
  sheetContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingTop: spacing.md },
  modalTitle: { ...typography.headingMedium },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryGreen + '15', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  detailLabel: { ...typography.captionText, color: colors.textSecondary, textTransform: 'uppercase', fontSize: 10 },
  detailValue: { ...typography.bodyText },
});
