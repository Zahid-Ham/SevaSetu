import { useLanguage } from '../../context/LanguageContext';
/**
 * AssignmentManagerScreen.tsx
 * Supervisor view — per-event volunteer assignment status dashboard.
 * Shows Pending / Accepted / Declined status for each volunteer assignment.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Switch, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '../../services/store/useEventStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { VolunteerAssignment, MOCK_PREDICTIONS, MissionTask } from '../../services/api/eventPredictionService';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader, DynamicText } from '../../components';
import { ProofPeekModal } from '../../components/common/ProofPeekModal';
import { getBilingualText } from '../../utils/bilingualHelpers';

const STATUS_CONFIG = {
  pending:  { label: 'supervisor.assignmentManager.pending',  color: '#F59E0B', bg: '#FEF3C7', icon: 'clock' as const },
  accepted: { label: 'supervisor.assignmentManager.accepted', color: '#10B981', bg: '#D1FAE5', icon: 'check-circle' as const },
  declined: { label: 'supervisor.assignmentManager.declined', color: '#EF4444', bg: '#FEE2E2', icon: 'x-circle' as const },
};

export const AssignmentManagerScreen = ({ navigation, route }: any) => {
  const initialEventId = route.params?.eventId || null;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [refreshing, setRefreshing] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<VolunteerAssignment | null>(null);
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<MissionTask | null>(null);
  const [isProofModalVisible, setIsProofModalVisible] = useState(false);

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
  const { user } = useAuthStore();
  const { t, language } = useLanguage();

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
  const pendingCount  = eventAssignments.filter((a) => a.status?.toLowerCase() === 'pending').length;
  const acceptedCount = eventAssignments.filter((a) => a.status?.toLowerCase() === 'accepted').length;
  const declinedCount = eventAssignments.filter((a) => a.status?.toLowerCase() === 'declined').length;

  // Group by status
  const grouped: Record<string, VolunteerAssignment[]> = {
    accepted: eventAssignments.filter((a) => a.status === 'accepted'),
    pending:  eventAssignments.filter((a) => a.status === 'pending'),
    declined: eventAssignments.filter((a) => a.status === 'declined'),
  };

  // Use real data or empty list (no more mock override for better transparency)
  const displayAssignments = eventAssignments;

  // Group by status
  const displayGrouped: Record<string, VolunteerAssignment[]> = {
    accepted: displayAssignments.filter((a) => a.status?.toLowerCase() === 'accepted'),
    pending:  displayAssignments.filter((a) => a.status?.toLowerCase() === 'pending'),
    declined: displayAssignments.filter((a) => a.status?.toLowerCase() === 'declined'),
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title={t('supervisor.assignmentManager.title')} 
        showBack={true} 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} />}
      >
        {/* Event selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('supervisor.assignmentManager.selectEvent')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {/* Always show mock confirmed event for demo */}
            {(confirmedEvents.length > 0 ? confirmedEvents : MOCK_PREDICTIONS.filter((p) => p.status === 'confirmed')).map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={[styles.eventChip, selectedEventId === evt.id && styles.eventChipActive]}
                onPress={() => setSelectedEventId(evt.id)}
              >
                <Text style={[styles.eventChipText, selectedEventId === evt.id && styles.eventChipTextActive]}>
                  {(() => {
                    const typeStr = getBilingualText(evt.event_type, language);
                    const translated = t(`demo.${typeStr}`);
                    return translated !== `demo.${typeStr}` ? translated : typeStr;
                  })()}
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
              <DynamicText style={styles.summaryEventType} text={selectedEvent.event_type} />
              <DynamicText style={styles.summaryArea} text={selectedEvent.area} />
              <Text style={styles.summaryDateRange}>
                {selectedEvent.predicted_date_start} → {selectedEvent.predicted_date_end}
              </Text>
              <Text style={styles.summaryHeadcount}>
                {t('supervisor.assignmentManager.target')} {selectedEvent.estimated_headcount} {t('supervisor.assignmentManager.volunteers')}
              </Text>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>{t('supervisor.assignmentManager.fillRate')}</Text>
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
              <StatChip label={t('supervisor.assignmentManager.pending')} value={displayAssignments.filter(a => a.status === 'pending').length} color="#F59E0B" />
              <StatChip label={t('supervisor.assignmentManager.accepted')} value={displayAssignments.filter(a => a.status === 'accepted').length} color="#10B981" />
              <StatChip label={t('supervisor.assignmentManager.declined')} value={displayAssignments.filter(a => a.status === 'declined').length} color="#EF4444" />
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
                    {t(cfg.label)} ({items.length})
                  </Text>
                </View>
                {items.map((a) => (
                  <AssignmentRow 
                    key={a.id} 
                    assignment={a} 
                    allProfiles={allVolunteerProfiles} 
                    navigation={navigation}
                    user={user}
                    onOpenTasks={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {}
                      setActiveAssignment(a);
                    }}
                  />
                ))}
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mission Tasks Modal */}
      <MissionTasksModal
        visible={!!activeAssignment}
        assignment={activeAssignment!}
        onClose={() => setActiveAssignment(null)}
        onViewProof={(task) => {
          setSelectedTaskForProof(task);
          setIsProofModalVisible(true);
        }}
      />

      <ProofPeekModal
        isVisible={isProofModalVisible}
        task={selectedTaskForProof}
        assignmentId={activeAssignment?.id || ''}
        onClose={() => setIsProofModalVisible(false)}
      />
    </View>
  );
};

// ── Mission Tasks Modal ────────────────────────────────────────────────────────

const MissionTasksModal = ({ visible, assignment, onClose, onViewProof }: {
  visible: boolean;
  assignment: VolunteerAssignment;
  onClose: () => void;
  onViewProof: (task: MissionTask) => void;
}) => {
  const { tasks, loadTasks, addTask, approveTask, loadingAction } = useEventStore();
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [proofRequired, setProofRequired] = useState(false);

  useEffect(() => {
    if (visible && assignment) {
      loadTasks(assignment.id);
    }
  }, [visible, assignment]);

  const assignmentTasks = assignment ? tasks[assignment.id] || [] : [];

  const handleAddTask = async () => {
    if (!description.trim()) return;
    await addTask(assignment.id, description, proofRequired);
    setDescription('');
    setProofRequired(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('supervisor.assignmentManager.missionTasks')}</Text>
              <DynamicText style={styles.modalSub} text={assignment.volunteer_name} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Add Task Form */}
            <View style={styles.addTaskForm}>
              <TextInput
                style={styles.taskInput}
                placeholder={t('volunteer.home.addTaskPlaceholder') || "Describe a task..."}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <View style={styles.taskOptions}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('supervisor.assignmentManager.proofRequired')}</Text>
                  <Switch
                    value={proofRequired}
                    onValueChange={setProofRequired}
                    trackColor={{ false: '#D1D5DB', true: colors.primaryGreen }}
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.addTaskBtn, !description.trim() && { opacity: 0.5 }]} 
                  onPress={handleAddTask}
                  disabled={!description.trim() || loadingAction}
                >
                  <Text style={styles.addTaskBtnText}>{t('supervisor.assignmentManager.addTask')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tasks List */}
            <View style={styles.tasksList}>
              <Text style={styles.listLabel}>{t('common.status').toUpperCase()} ({assignmentTasks.length})</Text>
              {assignmentTasks.length === 0 ? (
                <View style={styles.emptyTasks}>
                  <Feather name="clipboard" size={40} color={colors.textSecondary} style={{ opacity: 0.2 }} />
                  <Text style={styles.emptyTasksText}>{t('supervisor.assignmentManager.noTasks') || "No tasks assigned yet."}</Text>
                </View>
              ) : (
                assignmentTasks.map((task: MissionTask) => (
                  <View key={task.id} style={styles.taskItem}>
                    <View style={styles.taskStatusIndicator}>
                      <Feather 
                        name={task.status === 'completed' ? 'check-circle' : task.status === 'under_review' ? 'clock' : task.status === 'rejected' ? 'alert-circle' : 'circle'} 
                        size={20} 
                        color={task.status === 'completed' ? colors.success : task.status === 'under_review' ? colors.warning : task.status === 'rejected' ? colors.error : colors.textSecondary} 
                      />
                    </View>
                    <View style={styles.taskMain}>
                      <DynamicText style={[styles.taskDesc, (task.status === 'completed' || task.status === 'under_review') && styles.taskDescDone]} text={task.description} />
                      
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        {task.status === 'under_review' && (
                          <View style={[styles.proofBadge, { backgroundColor: colors.warning + '10' }]}>
                            <Text style={[styles.proofBadgeText, { color: colors.warning }]}>⏳ {t('supervisor.assignmentManager.underReview').toUpperCase()}</Text>
                          </View>
                        )}
                        {task.status === 'rejected' && (
                          <View style={[styles.proofBadge, { backgroundColor: colors.error + '10' }]}>
                            <Text style={[styles.proofBadgeText, { color: colors.error }]}>❌ {t('supervisor.assignmentManager.rejected').toUpperCase()}</Text>
                          </View>
                        )}
                        {task.ai_verification && (
                          <View style={[styles.proofBadge, { backgroundColor: task.ai_verification.confidence_score > 80 ? '#4ADE8020' : '#FBBF2420' }]}>
                            <Text style={[styles.proofBadgeText, { color: task.ai_verification.confidence_score > 80 ? '#4ADE80' : '#FBBF24' }]}>
                              🤖 AI: {task.ai_verification.confidence_score}%
                            </Text>
                          </View>
                        )}
                        {task.proof_required && task.status === 'pending' && (
                          <View style={styles.proofBadge}>
                            <Text style={styles.proofBadgeText}>📎 {t('supervisor.assignmentManager.proofRequired')}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {task.status === 'under_review' ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {task.proof_url && (
                          <TouchableOpacity 
                            style={[styles.chatRowBtn, { backgroundColor: colors.primaryGreen + '10', paddingHorizontal: 12 }]} 
                            onPress={() => onViewProof(task)}
                          >
                            <Feather name="eye" size={14} color={colors.primaryGreen} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={[styles.chatRowBtn, { backgroundColor: colors.success + '10', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 }]} 
                          onPress={() => approveTask(task.id, assignment.id)}
                          disabled={loadingAction}
                        >
                          <Feather name="check" size={14} color={colors.success} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>{t('supervisor.assignmentManager.approve')}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      (task.status === 'completed' && task.proof_url) && (
                        <TouchableOpacity 
                          style={styles.taskProof} 
                          onPress={() => onViewProof(task)}
                        >
                          <Feather name="image" size={16} color={colors.primaryGreen} />
                          <Text style={{ fontSize: 10, color: colors.primaryGreen, marginLeft: 4 }}>{t('supervisor.assignmentManager.viewProof')}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={{ height: 20 }} />
        </View>
      </View>
    </Modal>
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
  navigation,
  onOpenTasks,
  user
}: { 
  assignment: VolunteerAssignment; 
  allProfiles: any[];
  navigation: any;
  onOpenTasks?: () => void;
  user: any;
}) => {
  const { t } = useLanguage();
  const cfg = STATUS_CONFIG[assignment.status] ?? STATUS_CONFIG.pending;
  const matchPct = Math.round(assignment.match_score * 100);

  // Cross-reference with live profile to show CURRENT skills
  const liveProfile = allProfiles.find(p => p.volunteer_id === assignment.volunteer_id);
  const skillsToDisplay = liveProfile ? liveProfile.skills : assignment.volunteer_skills;

  return (
    <TouchableOpacity 
      style={[globalStyles.card, styles.assignmentRow]}
      activeOpacity={0.7}
      onPress={() => {
        if (assignment.status?.toLowerCase() !== 'accepted') {
          Alert.alert(t('supervisor.assignmentManager.proofRequired'), t('supervisor.assignmentManager.noTasks'));
          return;
        }
        if (onOpenTasks) onOpenTasks();
      }}
    >
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
            <DynamicText style={styles.volunteerName} text={liveProfile?.fullName || assignment.volunteer_name} />
            {liveProfile && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />}
          </View>
          <DynamicText style={styles.volunteerArea} text={liveProfile?.area || assignment.volunteer_area || 'Area unknown'} />
          <View style={styles.skillsRow}>
            {(Array.isArray(skillsToDisplay) ? skillsToDisplay : [])
              .slice(0, 4)
              .map((s: string) => (
                <View key={s} style={styles.microChip}>
                  <Text style={styles.microChipText}>
                    {t(`skills.${s}`) !== `skills.${s}` ? t(`skills.${s}`) : (s || '').replace('_', ' ')}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      </View>
      <View style={styles.rightCol}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Chat', {
            volunteer_id: assignment.volunteer_id,
            supervisor_id: user?.id || '',
            event_id: assignment.event_id,
            recipient_name: assignment.volunteer_name,
            volunteer_name: assignment.volunteer_name,
            supervisor_name: user?.name || 'Supervisor',
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
          <Text style={[styles.statusPillText, { color: cfg.color }]}>{t(cfg.label)}</Text>
        </View>
        <Text style={[styles.matchPct, { color: matchPct >= 75 ? colors.success : matchPct >= 55 ? colors.warning : colors.error }]}>
          {matchPct}% {t('tasks.matchTitle') || "match"}
        </Text>
        {assignment.is_fallback && (
          <View style={styles.fallbackPill}>
            <Text style={styles.fallbackPillText}>{t('supervisor.assignmentManager.fallback') || 'Fallback'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: colors.textPrimary },
  modalSub: { fontSize: 14, color: colors.textSecondary },
  modalCloseBtn: { padding: 4 },
  modalBody: { flex: 1 },
  addTaskForm: { backgroundColor: colors.background, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: '#EAEEF2' },
  taskInput: { fontSize: 15, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', padding: spacing.sm, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  taskOptions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' as const },
  addTaskBtn: { backgroundColor: colors.primaryGreen, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 10 },
  addTaskBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  tasksList: { paddingHorizontal: spacing.sm },
  listLabel: { fontSize: 11, fontWeight: '700' as const, color: colors.textSecondary, letterSpacing: 1, marginBottom: spacing.md },
  emptyTasks: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTasksText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, opacity: 0.5 },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  taskStatusIndicator: { width: 24, alignItems: 'center' },
  taskMain: { flex: 1 },
  taskDesc: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' as const },
  taskDescDone: { textDecorationLine: 'line-through', color: colors.textSecondary, opacity: 0.7 },
  proofBadge: { backgroundColor: colors.accentBlue + '10', alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  proofBadgeText: { fontSize: 10, color: colors.accentBlue, fontWeight: '700' as const },
  taskProof: { width: 32, height: 32, backgroundColor: colors.primaryGreen + '10', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
