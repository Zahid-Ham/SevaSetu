/**
 * EventForecastScreen.tsx
 * Supervisor view — full AI forecast list with confidence heatmap cards.
 * Coordinator can confirm, edit, or dismiss predictions.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '../../services/store/useEventStore';
import { PredictedEvent } from '../../services/api/eventPredictionService';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader, LocationPickerModal } from '../../components';

const CATEGORY_ICONS: Record<string, string> = {
  Water: '💧', Health: '🏥', Sanitation: '🧹', Education: '📚',
  Infrastructure: '🏗️', Safety: '🦺', Environment: '🌿',
};

const SKILL_LABELS: Record<string, string> = {
  first_aid: 'First Aid', logistics: 'Logistics', teaching: 'Teaching',
  construction: 'Construction', medical: 'Medical', crowd_management: 'Crowd Mgmt',
  documentation: 'Documentation', cooking: 'Cooking', driving: 'Driving', counseling: 'Counseling',
};

const TIER_CONFIG = {
  high:   { label: 'High Confidence', gradient: ['#1B5E20', '#2E7D32'] as const, text: '#fff', dot: '#66BB6A' },
  medium: { label: 'Medium Confidence', gradient: ['#E65100', '#F57F17'] as const, text: '#fff', dot: '#FFD54F' },
  low:    { label: 'Low Confidence', gradient: ['#1A237E', '#3949AB'] as const, text: '#fff', dot: '#90CAF9' },
};

export const EventForecastScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'forecast' | 'live'>('forecast');
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [generatingNew, setGeneratingNew] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PredictedEvent | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editHeadcount, setEditHeadcount] = useState('');
  const [editLatitude, setEditLatitude] = useState<number | undefined>();
  const [editLongitude, setEditLongitude] = useState<number | undefined>();
  const [editGeofenceRadius, setEditGeofenceRadius] = useState(150);
  const [editArea, setEditArea] = useState('');
  const [editScheme, setEditScheme] = useState('');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const { 
    predictions, 
    loadPredictions, 
    triggerNewPredictions, 
    confirmEvent, 
    dismissEvent, 
    deleteEvent,
    stopEvent,
    loadingPredictions, 
    loadingAction 
  } = useEventStore();

  useEffect(() => {
    loadPredictions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPredictions();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    setGeneratingNew(true);
    await triggerNewPredictions('Maharashtra');
    setGeneratingNew(false);
  };

  const handleConfirm = (event: PredictedEvent) => {
    setEditingEvent(event);
    setEditStart(event.predicted_date_start || '');
    setEditEnd(event.predicted_date_end || '');
    setEditHeadcount(event.estimated_headcount?.toString() || '');
    setEditLatitude(event.latitude);
    setEditLongitude(event.longitude);
    setEditGeofenceRadius(event.geofence_radius || 150);
    setEditArea(event.area || '');
    setEditScheme(event.suggested_govt_scheme || '');
  };

  const handleApplyConfirm = async () => {
    if (!editingEvent) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await confirmEvent(editingEvent.id, {
      predicted_date_start: editStart,
      predicted_date_end: editEnd,
      estimated_headcount: parseInt(editHeadcount, 10) || editingEvent.estimated_headcount,
      latitude: editLatitude,
      longitude: editLongitude,
      geofence_radius: editGeofenceRadius,
      area: editArea,
      suggested_govt_scheme: editScheme,
    });
    setEditingEvent(null);
  };

  const handleDismiss = (event: PredictedEvent) => {
    Alert.alert(
      'Delete Forecast',
      `Permanently remove "${event.event_type}" from the system?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteEvent(event.id);
          },
        },
      ]
    );
  };

  const handleStopEvent = (event: PredictedEvent) => {
    Alert.alert(
      'Stop Mission',
      `Terminate "${event.event_type}"? Volunteers will be notified that the mission has ended.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Mission',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await stopEvent(event.id);
          },
        },
      ]
    );
  };

  const allActive = predictions.filter((p) => p.status !== 'dismissed' && (p.status as string) !== 'stopped');
  const forecastedEvents = allActive.filter(p => p.status === 'predicted');
  const liveEvents = allActive.filter(p => p.status === 'confirmed');

  const activePredictions = activeTab === 'forecast' ? forecastedEvents : liveEvents;
  const filtered = filter === 'all' ? activePredictions : activePredictions.filter((p) => p.tier === filter);

  const highCount = activePredictions.filter((p) => (p.tier || 'medium') === 'high').length;
  const medCount  = activePredictions.filter((p) => (p.tier || 'medium') === 'medium').length;
  const lowCount  = activePredictions.filter((p) => (p.tier || 'medium') === 'low').length;

  return (
    <View style={styles.container}>
      <AppHeader title="Mission Control" />

      {/* Primary Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'forecast' && styles.tabItemActive]} 
          onPress={() => setActiveTab('forecast')}
        >
          <Feather name="zap" size={16} color={activeTab === 'forecast' ? colors.primaryGreen : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'forecast' && styles.tabTextActive]}>AI Forecast</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'live' && styles.tabItemActive]} 
          onPress={() => setActiveTab('live')}
        >
          <Feather name="activity" size={16} color={activeTab === 'live' ? colors.primaryGreen : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'live' && styles.tabTextActive]}>Live Missions</Text>
          {liveEvents.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{liveEvents.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} />}
      >
        {/* Heatmap summary bar - Only visible in Forecast tab */}
        {activeTab === 'forecast' && (
          <LinearGradient colors={['#1A237E', '#283593']} style={styles.heatmapHeader}>
            <Text style={styles.heatmapTitle}>🔮 Prediction Heatmap</Text>
            <Text style={styles.heatmapSub}>{activePredictions.length} upcoming events forecasted</Text>
            <View style={styles.heatmapBar}>
              {highCount > 0 && (
                <View style={[styles.heatmapSegment, { flex: highCount, backgroundColor: '#66BB6A' }]} />
              )}
              {medCount > 0 && (
                <View style={[styles.heatmapSegment, { flex: medCount, backgroundColor: '#FFD54F' }]} />
              )}
              {lowCount > 0 && (
                <View style={[styles.heatmapSegment, { flex: lowCount, backgroundColor: '#90CAF9' }]} />
              )}
            </View>
            <View style={styles.heatmapLegend}>
              <HeatmapLegendItem color="#66BB6A" label={`${highCount} High`} />
              <HeatmapLegendItem color="#FFD54F" label={`${medCount} Medium`} />
              <HeatmapLegendItem color="#90CAF9" label={`${lowCount} Low`} />
            </View>
          </LinearGradient>
        )}

        {/* Generate new predictions / Manual create row - Only visible in Forecast tab */}
        {activeTab === 'forecast' && (
          <View style={styles.genSection}>
            <TouchableOpacity
              style={[styles.generateBtn, { flex: 1 }]}
              onPress={handleGenerate}
              disabled={generatingNew}
            >
              <LinearGradient
                colors={['#FF8C42', '#E65100']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.generateGradient}
              >
                {generatingNew
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Feather name="zap" size={16} color="#fff" /><Text style={styles.generateBtnText}>Run AI Prediction</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => navigation.navigate('ManualEvent')}
            >
              <Feather name="plus" size={16} color={colors.primaryGreen} />
              <Text style={styles.manualBtnTxt}>Manual Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'All Events' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cards */}
        <View style={styles.cardsList}>
          {loadingPredictions && !refreshing ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primaryGreen} />
              <Text style={[typography.captionText, { marginTop: spacing.sm }]}>Loading forecast…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{activeTab === 'forecast' ? '🔮' : '📡'}</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'forecast' ? 'No New Predictions' : 'No Active Missions'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'forecast' 
                  ? 'All predictions have been confirmed or dismissed. Check the "Live Missions" tab for active operations.'
                  : 'There are no live missions running. Confirm an AI prediction or create a manual event to get started.'}
              </Text>
              {activeTab === 'forecast' && liveEvents.length > 0 && (
                <TouchableOpacity 
                  style={[styles.manualBtn, { marginTop: spacing.md, width: '100%' }]} 
                  onPress={() => setActiveTab('live')}
                >
                  <Text style={styles.manualBtnTxt}>View {liveEvents.length} Live Mission{liveEvents.length > 1 ? 's' : ''}</Text>
                  <Feather name="arrow-right" size={14} color={colors.primaryGreen} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map((event, i) => (
              <ForecastCard
                key={event.id}
                event={event}
                index={i}
                onConfirm={() => handleConfirm(event)}
                onDismiss={() => handleDismiss(event)}
                onStop={() => handleStopEvent(event)}
                onManage={() => navigation.navigate('AssignmentManager', { eventId: event.id })}
                loadingAction={loadingAction}
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Event Modal */}
      <Modal visible={!!editingEvent} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure Event</Text>
              <TouchableOpacity onPress={() => setEditingEvent(null)} hitSlop={10}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Adjust the AI's predictions before dispatching volunteers.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date <Text style={{fontSize: 10, color: colors.textSecondary, fontWeight: '400'}}>(YYYY-MM-DD)</Text></Text>
              <TextInput style={styles.input} value={editStart} onChangeText={setEditStart} placeholder="e.g. 2026-04-10" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date <Text style={{fontSize: 10, color: colors.textSecondary, fontWeight: '400'}}>(YYYY-MM-DD)</Text></Text>
              <TextInput style={styles.input} value={editEnd} onChangeText={setEditEnd} placeholder="e.g. 2026-04-12" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Volunteers Needed</Text>
              <TextInput style={styles.input} value={editHeadcount} onChangeText={setEditHeadcount} keyboardType="numeric" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Govt Scheme</Text>
              <TextInput style={styles.input} value={editScheme} onChangeText={setEditScheme} placeholder="e.g. Jal Jeevan Mission" />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.label}>Location</Text>
               <TouchableOpacity 
                 style={[styles.input, styles.locationBtn]} 
                 onPress={() => setLocationPickerVisible(true)}
               >
                 <Feather name="map-pin" size={16} color={colors.primaryGreen} />
                 <Text style={styles.locationBtnTxt} numberOfLines={1}>
                   {editLatitude ? editArea : "📍 Set Mission Location on Map"}
                 </Text>
               </TouchableOpacity>
               {editLatitude && (
                 <Text style={styles.coordinatesHint}>
                   {editLatitude.toFixed(4)}, {editLongitude?.toFixed(4)} • Radius: {editGeofenceRadius}m
                 </Text>
               )}
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleApplyConfirm} disabled={loadingAction}>
               {loadingAction ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitTxt}>Confirm & Dispatch</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <LocationPickerModal
          visible={locationPickerVisible}
          onClose={() => setLocationPickerVisible(false)}
          onConfirm={(loc) => {
            setEditArea(loc.address);
            setEditLatitude(loc.latitude);
            setEditLongitude(loc.longitude);
            setEditGeofenceRadius(loc.geofence_radius);
          }}
          initialLocation={editLatitude && editLongitude ? { latitude: editLatitude, longitude: editLongitude, address: editArea } : undefined}
        />
      </Modal>

    </View>
  );
};

// ── Heatmap Legend Item ─────────────────────────────────────────────────────────

const HeatmapLegendItem = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{label}</Text>
  </View>
);

// ── Forecast Card ───────────────────────────────────────────────────────────────

const ForecastCard = ({
  event, index, onConfirm, onDismiss, onStop, onManage, loadingAction,
}: {
  event: PredictedEvent;
  index: number;
  onConfirm: () => void;
  onDismiss: () => void;
  onStop: () => void;
  onManage: () => void;
  loadingAction: boolean;
}) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tier = event.tier || 'medium';
  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.medium;
  const confidencePct = Math.round(event.confidence_score * 100) || 75;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const isConfirmed = event.status === 'confirmed';

  return (
    <Animated.View style={[{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }, styles.cardWrapper]}>
      <View style={[globalStyles.card, styles.forecastCard]}>

        {/* Tier badge strip */}
        <LinearGradient colors={tierConfig.gradient} style={styles.tierStrip}>
          <View style={styles.tierStripContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.tierDot, { backgroundColor: tierConfig.dot }]} />
              <Text style={styles.tierLabel}>{tierConfig.label}</Text>
            </View>
            <Text style={styles.confidencePct}>{confidencePct}%</Text>
          </View>

          {/* Confidence bar */}
          <View style={styles.confBarBg}>
            <View style={[styles.confBarFill, { width: `${confidencePct}%` as any }]} />
          </View>
        </LinearGradient>

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.categoryIcon}>{CATEGORY_ICONS[event.category] || '📋'}</Text>
          <View style={styles.titleGroup}>
            <Text style={styles.eventType}>{event.event_type}</Text>
            <Text style={styles.eventArea}><Feather name="map-pin" size={11} /> {event.area}</Text>
          </View>
          {isConfirmed && (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedBadgeText}>✅ Confirmed</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={styles.description}>{event.description}</Text>

        {/* Confidence reason */}
        <View style={styles.reasonBox}>
          <Feather name="cpu" size={12} color={colors.accentBlue} />
          <Text style={styles.reasonText}>{event.confidence_reason}</Text>
        </View>

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          <DetailChip icon="calendar" label="Predicted Dates" value={`${event.predicted_date_start} – ${event.predicted_date_end}`} />
          <DetailChip icon="users" label="Volunteers Needed" value={`${event.estimated_headcount} people`} />
          <DetailChip icon="briefcase" label="Govt Scheme" value={event.suggested_govt_scheme} />
        </View>

        {/* Required skills */}
        <View style={styles.skillsSection}>
          <Text style={styles.skillsTitle}>Required Skills</Text>
          <View style={styles.skillsRow}>
            {event.required_skills.map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{SKILL_LABELS[skill] || skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Live Mission specific data (Progress) */}
        {isConfirmed && (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>VOLUNTEER FILL RATE</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryGreen }}>
                  {event.accepted_count || 0} / {event.estimated_headcount}
                </Text>
             </View>
             <View style={{ height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                <View style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(((event.accepted_count || 0) / Math.max(event.estimated_headcount, 1)) * 100, 100)}%` as any }
                ]} />
             </View>
          </View>
        )}

        {/* Actions for Forecasts */}
        {!isConfirmed && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} disabled={loadingAction}>
              <Feather name="trash-2" size={15} color={colors.error} />
              <Text style={styles.dismissBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={loadingAction}>
              <LinearGradient colors={['#2E7D32', '#1B5E20']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmGradient}>
                {loadingAction
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Feather name="check-circle" size={15} color="#fff" /><Text style={styles.confirmBtnText}>Confirm & Dispatch</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions for Live Missions */}
        {isConfirmed && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onStop} disabled={loadingAction}>
              <Feather name="stop-circle" size={15} color={colors.error} />
              <Text style={styles.dismissBtnText}>Stop Mission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onManage} disabled={loadingAction}>
              <LinearGradient colors={['#1A237E', '#283593']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmGradient}>
                 <Feather name="users" size={15} color="#fff" />
                 <Text style={styles.confirmBtnText}>Manage Team</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ── Detail Chip ──────────────────────────────────────────────────────────────────

const DetailChip = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.detailChip}>
    <Feather name={icon} size={12} color={colors.textSecondary} />
    <View>
      <Text style={styles.detailChipLabel}>{label}</Text>
      <Text style={styles.detailChipValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: colors.primaryGreen },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primaryGreen, fontWeight: '700' },
  tabBadge: { backgroundColor: colors.error, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 8, right: '25%' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  heatmapHeader: { margin: spacing.md, borderRadius: 16, padding: spacing.lg },
  heatmapTitle: { color: '#fff', fontSize: 16, fontWeight: '700' as const, marginBottom: 2 },
  heatmapSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: spacing.md },
  heatmapBar: { height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', marginBottom: spacing.sm },
  heatmapSegment: { height: '100%' },
  heatmapLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  genSection: { paddingHorizontal: spacing.md, marginBottom: spacing.md, flexDirection: 'row', gap: spacing.sm },
  generateBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  generateGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  generateBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
  filterRow: { marginBottom: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: '#E0E0E0' },
  filterChipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  filterChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' as const },
  filterChipTextActive: { color: '#fff', fontWeight: '700' as const },
  cardsList: { paddingHorizontal: spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 52, marginBottom: spacing.md },
  emptyTitle: { ...typography.headingSmall, marginBottom: spacing.sm },
  emptySub: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  cardWrapper: { marginBottom: spacing.md },
  forecastCard: { padding: 0, overflow: 'hidden', borderRadius: 16 },
  tierStrip: { padding: spacing.md },
  tierStripContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { color: '#fff', fontSize: 12, fontWeight: '600' as const },
  confidencePct: { color: '#fff', fontSize: 20, fontWeight: '800' as const },
  confBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' },
  confBarFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  categoryIcon: { fontSize: 28 },
  titleGroup: { flex: 1 },
  eventType: { fontSize: 16, fontWeight: '700' as const, color: colors.textPrimary },
  eventArea: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  confirmedBadge: { backgroundColor: colors.success + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  confirmedBadgeText: { fontSize: 11, color: colors.success, fontWeight: '600' as const },
  description: { ...typography.bodyText, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  progressBarFill: { height: '100%', backgroundColor: colors.primaryGreen, borderRadius: 3 },
  reasonBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, margin: spacing.md, backgroundColor: colors.accentBlue + '0D', borderRadius: 8, padding: spacing.sm },
  reasonText: { flex: 1, fontSize: 12, color: colors.accentBlue, lineHeight: 17 },
  detailsGrid: { paddingHorizontal: spacing.md, gap: spacing.sm },
  detailChip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detailChipLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailChipValue: { fontSize: 13, fontWeight: '600' as const, color: colors.textPrimary },
  skillsSection: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  skillsTitle: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: colors.primaryGreen + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.primaryGreen + '30' },
  skillChipText: { fontSize: 11, color: colors.primaryGreen, fontWeight: '600' as const },
  actionRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  dismissBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm, borderRadius: 10, borderWidth: 1.5, borderColor: colors.error },
  dismissBtnText: { color: colors.error, fontWeight: '600' as const, fontSize: 14 },
  confirmBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm },
  confirmBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  manualBtn: { flex: 0.6, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primaryGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  manualBtnTxt: { color: colors.primaryGreen, fontWeight: '700' as const, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { ...typography.headingSmall, color: colors.textPrimary },
  modalSub: { ...typography.bodyText, color: colors.textSecondary, marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: spacing.md, height: 48, fontSize: 16 },
  modalSubmitBtn: { backgroundColor: colors.primaryGreen, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  modalSubmitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-start' },
  locationBtnTxt: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  coordinatesHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
});
