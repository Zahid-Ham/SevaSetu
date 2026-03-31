/**
 * AssignmentManagerScreen.tsx
 * Supervisor view — per-event volunteer assignment status dashboard.
 * Shows Pending / Accepted / Declined status for each volunteer assignment.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '../../services/store/useEventStore';
import { VolunteerAssignment, MOCK_PREDICTIONS } from '../../services/api/eventPredictionService';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader } from '../../components';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#F59E0B', bg: '#FEF3C7', icon: 'clock' as const },
  accepted: { label: 'Accepted', color: '#10B981', bg: '#D1FAE5', icon: 'check-circle' as const },
  declined: { label: 'Declined', color: '#EF4444', bg: '#FEE2E2', icon: 'x-circle' as const },
};

export const AssignmentManagerScreen = ({ navigation, route }: any) => {
  const initialEventId = route.params?.eventId || null;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [refreshing, setRefreshing] = useState(false);

  const { 
    predictions, 
    eventAssignments, 
    allVolunteerProfiles,
    loadEventAssignments, 
    loadPredictions, 
    loadAllVolunteerProfiles,
    loadingAssignments, 
    loadingAction 
  } = useEventStore();

  const confirmedEvents = predictions.filter((p) => p.status === 'confirmed');

  useEffect(() => {
    loadPredictions();
    loadAllVolunteerProfiles();
  }, []);

  useEffect(() => {
    if (route.params?.eventId) {
      setSelectedEventId(route.params.eventId);
    }
  }, [route.params?.eventId]);

  useEffect(() => {
    // Only auto-select first event if no specific event was requested via navigation
    if (confirmedEvents.length > 0 && !selectedEventId && !initialEventId) {
      setSelectedEventId(confirmedEvents[0].id);
    }
  }, [confirmedEvents, selectedEventId, initialEventId]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventAssignments(selectedEventId);
    }
  }, [selectedEventId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedEventId) await loadEventAssignments(selectedEventId);
    setRefreshing(false);
  };

  const selectedEvent = predictions.find((p) => p.id === selectedEventId)
    || (confirmedEvents.length === 0 ? MOCK_PREDICTIONS.find((p) => p.id === selectedEventId) : undefined);

  // Build assignment stats
  const pendingCount  = eventAssignments.filter((a) => a.status === 'pending').length;
  const acceptedCount = eventAssignments.filter((a) => a.status === 'accepted').length;
  const declinedCount = eventAssignments.filter((a) => a.status === 'declined').length;

  // Group by status
  const grouped: Record<string, VolunteerAssignment[]> = {
    accepted: eventAssignments.filter((a) => a.status === 'accepted'),
    pending:  eventAssignments.filter((a) => a.status === 'pending'),
    declined: eventAssignments.filter((a) => a.status === 'declined'),
  };

  // Use real data or empty list (no more mock override for better transparency)
  const displayAssignments = eventAssignments;

  const displayGrouped: Record<string, VolunteerAssignment[]> = {
    accepted: displayAssignments.filter((a) => a.status === 'accepted'),
    pending:  displayAssignments.filter((a) => a.status === 'pending'),
    declined: displayAssignments.filter((a) => a.status === 'declined'),
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Assignment Manager" 
        showBack={true} 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} />}
      >
        {/* Event selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT EVENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {/* Always show mock confirmed event for demo */}
            {(confirmedEvents.length > 0 ? confirmedEvents : MOCK_PREDICTIONS.filter((p) => p.status === 'confirmed')).map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={[styles.eventChip, selectedEventId === evt.id && styles.eventChipActive]}
                onPress={() => setSelectedEventId(evt.id)}
              >
                <Text style={[styles.eventChipText, selectedEventId === evt.id && styles.eventChipTextActive]}>
                  {evt.event_type}
                </Text>
                <Text style={[styles.eventChipDate, selectedEventId === evt.id && { color: 'rgba(255,255,255,0.8)' }]}>
                  {evt.predicted_date_start}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedEvent && (
          <>
            {/* Event summary card */}
            <LinearGradient colors={['#1A237E', '#283593']} style={[styles.eventSummaryCard]}>
              <Text style={styles.summaryEventType}>{selectedEvent.event_type}</Text>
              <Text style={styles.summaryArea}><Feather name="map-pin" size={12} /> {selectedEvent.area}</Text>
              <Text style={styles.summaryDateRange}>
                {selectedEvent.predicted_date_start} → {selectedEvent.predicted_date_end}
              </Text>
              <Text style={styles.summaryHeadcount}>
                Target: {selectedEvent.estimated_headcount} volunteers
              </Text>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Fill Rate</Text>
                  <Text style={styles.progressValue}>
                    {acceptedCount}/{selectedEvent.estimated_headcount}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {
                    width: `${Math.min(((acceptedCount) / Math.max(selectedEvent.estimated_headcount, 1)) * 100, 100)}%` as any,
                    backgroundColor: (acceptedCount / Math.max(selectedEvent.estimated_headcount, 1)) >= 0.8 ? '#66BB6A' : (acceptedCount / Math.max(selectedEvent.estimated_headcount, 1)) >= 0.4 ? '#FFD54F' : '#EF5350'
                  }]} />
                </View>
              </View>
            </LinearGradient>

            {/* Stat chips */}
            <View style={styles.statRow}>
              <StatChip label="Pending" value={displayAssignments.filter(a => a.status === 'pending').length} color="#F59E0B" />
              <StatChip label="Accepted" value={displayAssignments.filter(a => a.status === 'accepted').length} color="#10B981" />
              <StatChip label="Declined" value={displayAssignments.filter(a => a.status === 'declined').length} color="#EF4444" />
            </View>
          </>
        )}

        {/* Assignments list grouped by status */}
        {loadingAssignments && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
          </View>
        ) : (
          (['accepted', 'pending', 'declined'] as const).map((status) => {
            const items = displayGrouped[status];
            if (items.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <View key={status} style={styles.section}>
                <View style={styles.statusGroupHeader}>
                  <Feather name={cfg.icon} size={15} color={cfg.color} />
                  <Text style={[styles.statusGroupTitle, { color: cfg.color }]}>
                    {cfg.label} ({items.length})
                  </Text>
                </View>
                {items.map((a) => (
                  <AssignmentRow 
                    key={a.id} 
                    assignment={a} 
                    allProfiles={allVolunteerProfiles} 
                    navigation={navigation}
                  />
                ))}
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ── Stat Chip ────────────────────────────────────────────────────────────────────────

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[styles.statChip, { borderTopColor: color, borderTopWidth: 3 }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Assignment Row ───────────────────────────────────────────────────────────────────

const AssignmentRow = ({ 
  assignment, 
  allProfiles,
  navigation
}: { 
  assignment: VolunteerAssignment; 
  allProfiles: any[];
  navigation: any;
}) => {
  const cfg = STATUS_CONFIG[assignment.status] ?? STATUS_CONFIG.pending;
  const matchPct = Math.round(assignment.match_score * 100);

  // Cross-reference with live profile to show CURRENT skills
  const liveProfile = allProfiles.find(p => p.volunteer_id === assignment.volunteer_id);
  const skillsToDisplay = liveProfile ? liveProfile.skills : assignment.volunteer_skills;

  return (
    <View style={[globalStyles.card, styles.assignmentRow]}>
      <View style={styles.volunteerInfo}>
        {/* Avatar placeholder */}
        <LinearGradient colors={['#1A237E', '#3949AB']} style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(assignment.volunteer_name || 'Volunteer')
              .split(' ')
              .map((n) => n[0] || '')
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </Text>
        </LinearGradient>
        <View style={styles.volunteerDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.volunteerName}>{assignment.volunteer_name}</Text>
            {liveProfile && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />}
          </View>
          <Text style={styles.volunteerArea}>{liveProfile?.area || assignment.volunteer_area || 'Area unknown'}</Text>
          <View style={styles.skillsRow}>
            {(Array.isArray(skillsToDisplay) ? skillsToDisplay : [])
              .slice(0, 4)
              .map((s: string) => (
                <View key={s} style={styles.microChip}>
                  <Text style={styles.microChipText}>{(s || '').replace('_', ' ')}</Text>
                </View>
              ))}
          </View>
        </View>
      </View>
      <View style={styles.rightCol}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Chat', {
            volunteer_id: assignment.volunteer_id,
            supervisor_id: 'sup_deepak_1',
            event_id: assignment.event_id,
            recipient_name: assignment.volunteer_name,
            volunteer_name: assignment.volunteer_name,
            supervisor_name: 'Deepak Chawla (Supervisor)',
            event_name: assignment.event_type,
            metadata: {
              event_name: assignment.event_type,
              event_description: assignment.event_description || 'No description available.',
              match_score: matchPct,
              area: liveProfile?.area || assignment.volunteer_area || 'Nagpur',
              skills: skillsToDisplay
            }
          })}
          style={styles.chatRowBtn}
        >
          <Feather name="message-square" size={18} color={colors.primaryGreen} />
        </TouchableOpacity>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={[styles.matchPct, { color: matchPct >= 75 ? colors.success : matchPct >= 55 ? colors.warning : colors.error }]}>
          {matchPct}% match
        </Text>
        {assignment.is_fallback && (
          <View style={styles.fallbackPill}>
            <Text style={styles.fallbackPillText}>Fallback</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Demo mock assignments ──────────────────────────────────────────────────────────────

const today = new Date();
const addDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().split('T')[0];

const MOCK_DEMO_ASSIGNMENTS: VolunteerAssignment[] = [
  { id: 'm1', volunteer_id: 'v1', volunteer_name: 'Anita Sharma', volunteer_skills: ['first_aid', 'medical'], volunteer_area: 'Nagpur', match_score: 0.92, score_breakdown: { skill_match_pct: 100, availability_pct: 90, area_match_pct: 90, fatigue_buffer_pct: 90 }, event_id: 'pred_4', event_type: 'Road Survey Camp', event_date_start: addDays(30), event_date_end: addDays(33), status: 'accepted', is_fallback: false },
  { id: 'm2', volunteer_id: 'v2', volunteer_name: 'Rajan Mehta', volunteer_skills: ['logistics', 'driving'], volunteer_area: 'Nagpur', match_score: 0.84, score_breakdown: { skill_match_pct: 67, availability_pct: 100, area_match_pct: 90, fatigue_buffer_pct: 80 }, event_id: 'pred_4', event_type: 'Road Survey Camp', event_date_start: addDays(30), event_date_end: addDays(33), status: 'accepted', is_fallback: false },
  { id: 'm3', volunteer_id: 'v3', volunteer_name: 'Priya Kulkarni', volunteer_skills: ['documentation'], volunteer_area: 'Nagpur', match_score: 0.71, score_breakdown: { skill_match_pct: 33, availability_pct: 100, area_match_pct: 90, fatigue_buffer_pct: 100 }, event_id: 'pred_4', event_type: 'Road Survey Camp', event_date_start: addDays(30), event_date_end: addDays(33), status: 'pending', is_fallback: false },
  { id: 'm4', volunteer_id: 'v4', volunteer_name: 'Suresh Patil', volunteer_skills: ['construction', 'logistics'], volunteer_area: 'Amravati', match_score: 0.68, score_breakdown: { skill_match_pct: 67, availability_pct: 80, area_match_pct: 50, fatigue_buffer_pct: 80 }, event_id: 'pred_4', event_type: 'Road Survey Camp', event_date_start: addDays(30), event_date_end: addDays(33), status: 'pending', is_fallback: false },
  { id: 'm5', volunteer_id: 'v5', volunteer_name: 'Deepa Joshi', volunteer_skills: ['first_aid'], volunteer_area: 'Nagpur', match_score: 0.55, score_breakdown: { skill_match_pct: 33, availability_pct: 60, area_match_pct: 90, fatigue_buffer_pct: 60 }, event_id: 'pred_4', event_type: 'Road Survey Camp', event_date_start: addDays(30), event_date_end: addDays(33), status: 'declined', is_fallback: false },
  { id: 'm6', volunteer_id: 'v6', volunteer_name: 'Vikram Rao', volunteer_skills: ['construction', 'documentation'], volunteer_area: 'Nagpur', match_score: 0.78, score_breakdown: { skill_match_pct: 67, availability_pct: 90, area_match_pct: 90, fatigue_buffer_pct: 70 }, event_id: 'pred_4', event_type: 'Road Survey Camp', event_date_start: addDays(30), event_date_end: addDays(33), status: 'pending', is_fallback: true },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontSize: 10, fontWeight: '700' as const, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  eventChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', minWidth: 140 },
  eventChipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  eventChipText: { fontSize: 13, fontWeight: '600' as const, color: colors.textPrimary },
  eventChipTextActive: { color: '#fff' },
  eventChipDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  eventSummaryCard: { marginHorizontal: spacing.md, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  summaryEventType: { color: '#fff', fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
  summaryArea: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  summaryDateRange: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  summaryHeadcount: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' as const, marginBottom: spacing.md },
  progressSection: {},
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  progressValue: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#66BB6A', borderRadius: 4 },
  statRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  statChip: { flex: 1, backgroundColor: colors.cardBackground, borderRadius: 12, padding: spacing.sm, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  statValue: { fontSize: 24, fontWeight: '800' as const },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statusGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  statusGroupTitle: { fontSize: 13, fontWeight: '700' as const, textTransform: 'uppercase', letterSpacing: 0.5 },
  assignmentRow: { marginBottom: spacing.sm, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volunteerInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
  volunteerDetails: { flex: 1 },
  volunteerName: { fontSize: 14, fontWeight: '600' as const, color: colors.textPrimary },
  volunteerArea: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  microChip: { backgroundColor: colors.accentBlue + '12', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  microChipText: { fontSize: 9, color: colors.accentBlue, fontWeight: '600' as const },
  chatRowBtn: {
    padding: 8,
    marginBottom: 4,
    backgroundColor: colors.primaryGreen + '10',
    borderRadius: 8,
  },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' as const },
  matchPct: { fontSize: 11, fontWeight: '600' as const },
  fallbackPill: { backgroundColor: colors.primarySaffron + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  fallbackPillText: { fontSize: 9, color: colors.primarySaffron, fontWeight: '600' as const },
});
