/**
 * AssignmentScreen.tsx
 * Volunteer view — Pending / Accepted / Past assignments.
 * Pending tab shows REAL-TIME matches against confirmed live events.
 * Each mission card has an "AI Reasoning" button showing why the volunteer was matched.
 */

import React, { useEffect, useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadGenericFile } from '../../services/api/UploadService';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator, RefreshControl, Modal,
  TouchableWithoutFeedback, TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '../../services/store/useEventStore';
import { LiveMatch, VolunteerAssignment, MissionTask } from '../../services/api/eventPredictionService';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader } from '../../components';

const TABS = ['Pending', 'Accepted', 'Past'] as const;
type Tab = typeof TABS[number];

const SKILL_ICONS: Record<string, string> = {
  first_aid: '🩺', logistics: '📦', teaching: '📚',
  construction: '🔧', medical: '💊', crowd_management: '👥',
  documentation: '📝', cooking: '🍳', driving: '🚗', counseling: '💬',
};

const CATEGORY_ICONS: Record<string, string> = {
  Water: '💧', Health: '🏥', Sanitation: '🧹', Education: '📚',
  Infrastructure: '🏗️', Safety: '🦺',
};

// ── AI Reasoning Modal ─────────────────────────────────────────────────────────

const ReasoningModal = ({ visible, reasoning, eventName, scoreBreakdown, onClose }: {
  visible: boolean;
  reasoning: string;
  eventName: string;
  scoreBreakdown?: any;
  onClose: () => void;
}) => {
  if (!visible) return null;

  // Fallback reasoning if the data was seeded before the AI update
  let aiText = reasoning || '';
  if (!aiText && scoreBreakdown) {
    const parts = [
      `Overall: Partial Match (Heuristic Data)`,
      `Skills: This mission utilizes your technical expertise (${scoreBreakdown.skill_match_pct || 0}% score).`,
      `Availability: Our records indicate a ${scoreBreakdown.availability_pct || 0}% overlap with the mission window.`,
      `Area: Proximity and travel distance contribute ${scoreBreakdown.area_match_pct || 0}% to your matching weight.`,
      `Workload: Your current assignment frequency is healthy (${scoreBreakdown.fatigue_buffer_pct || 0}% score).`
    ];
    aiText = parts.join('\n\n');
  }

  if (!aiText) {
    aiText = "Data Sync in Progress\n\nFull AI justification will appear once the mission details are re-verified by the dispatcher.";
  }

  const lines = aiText.split('\n\n');
  const headline = lines[0] || '';
  const details = lines.slice(1);

  const headlineColor =
    headline.includes('Excellent') ? colors.success :
    headline.includes('Good') ? colors.primarySaffron :
    colors.warning;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={modalStyles.sheet}>
              {/* Header */}
              <LinearGradient colors={['#1A237E', '#283593']} style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>🤖 AI Match Reasoning</Text>
                <Text style={modalStyles.headerSub}>{eventName}</Text>
                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                  <Feather name="x" size={20} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView contentContainerStyle={modalStyles.body}>
                {/* Overall score banner */}
                <View style={[modalStyles.scoreBanner, { borderColor: headlineColor, display: headline ? 'flex' : 'none' }]}>
                  <Text style={[modalStyles.scoreBannerText, { color: headlineColor }]}>
                    {headline}
                  </Text>
                </View>

                {/* Breakdown rows */}
                {details.map((line, i) => {
                  const icon =
                    line.startsWith('Skills:') ? '🎯' :
                    line.startsWith('Availability:') ? '📅' :
                    line.startsWith('Area:') ? '📍' :
                    line.startsWith('Workload:') ? '⚡' : '•';
                  const isPositive = line.includes('Fully') || line.includes('Perfect') || line.includes('No recent') || line.startsWith('Skills: You have') || line.includes('technical expertise');
                  const isWarning = line.includes('Partial') || line.includes('Moderate') || line.includes('near');
                  const borderColor = isPositive ? colors.success : isWarning ? colors.primarySaffron : colors.error;

                  return (
                    <View key={i} style={[modalStyles.reasonRow, { borderLeftColor: borderColor }]}>
                      <Text style={modalStyles.reasonIcon}>{icon}</Text>
                      <Text style={modalStyles.reasonText}>{line}</Text>
                    </View>
                  );
                })}

                <TouchableOpacity style={modalStyles.doneBtn} onPress={onClose}>
                  <Text style={modalStyles.doneBtnText}>Got it</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── Filter Modal ─────────────────────────────────────────────────────────────

const FilterModal = ({ visible, filters, onApply, onClose, onReset, availableSkills }: {
  visible: boolean;
  filters: FilterOptions;
  onApply: (f: FilterOptions) => void;
  onClose: () => void;
  onReset: () => void;
  availableSkills: string[];
}) => {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);

  useEffect(() => {
    if (visible) setTempFilters(filters);
  }, [visible, filters]);

  if (!visible) return null;

  const toggleSkill = (skill: string) => {
    setTempFilters(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.includes(skill)
        ? prev.requiredSkills.filter(s => s !== skill)
        : [...prev.requiredSkills, skill],
    }));
  };

  const updateThreshold = (key: keyof FilterOptions, val: number) => {
    setTempFilters(prev => ({ ...prev, [key]: val }));
  };

  const ThresholdSelector = ({ label, value, onSelect }: { label: string, value: number, onSelect: (v: number) => void }) => (
    <View style={filterStyles.thresholdContainer}>
      <Text style={filterStyles.thresholdLabel}>{label} ({value}%)</Text>
      <View style={filterStyles.thresholdOptions}>
        {[0, 25, 50, 75].map(v => (
          <TouchableOpacity 
            key={v} 
            style={[filterStyles.thresholdOption, value === v && filterStyles.thresholdOptionActive]}
            onPress={() => onSelect(v)}
          >
            <Text style={[filterStyles.thresholdOptionText, value === v && filterStyles.thresholdOptionTextActive]}>
              {v === 0 ? 'Any' : `>${v}%`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        <View style={[modalStyles.sheet, { maxHeight: '85%' }]}>
          <View style={filterStyles.header}>
            <TouchableOpacity onPress={onReset}>
              <Text style={filterStyles.resetText}>Reset</Text>
            </TouchableOpacity>
            <Text style={filterStyles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: spacing.lg }}>
            <Text style={filterStyles.sectionTitle}>Minimum Thresholds</Text>
            <ThresholdSelector 
              label="Skill Match" 
              value={tempFilters.minSkillMatch} 
              onSelect={(v) => updateThreshold('minSkillMatch', v)} 
            />
            <ThresholdSelector 
              label="Availability" 
              value={tempFilters.minAvailability} 
              onSelect={(v) => updateThreshold('minAvailability', v)} 
            />
            <ThresholdSelector 
              label="Area Match" 
              value={tempFilters.minAreaMatch} 
              onSelect={(v) => updateThreshold('minAreaMatch', v)} 
            />
            <ThresholdSelector 
              label="Overall AI Score" 
              value={tempFilters.minTotalScore} 
              onSelect={(v) => updateThreshold('minTotalScore', v)} 
            />

            <View style={{ marginTop: 24 }}>
              <Text style={filterStyles.sectionTitle}>Filter by Required Skills</Text>
              <View style={filterStyles.skillsGrid}>
                {availableSkills.map(skill => (
                  <TouchableOpacity 
                    key={skill} 
                    style={[filterStyles.skillChip, tempFilters.requiredSkills.includes(skill) && filterStyles.skillChipActive]}
                    onPress={() => toggleSkill(skill)}
                  >
                    <Text style={filterStyles.skillIcon}>{SKILL_ICONS[skill] || '🔸'}</Text>
                    <Text style={[filterStyles.skillName, tempFilters.requiredSkills.includes(skill) && filterStyles.skillNameActive]}>
                      {skill.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={filterStyles.footer}>
            <TouchableOpacity 
              style={filterStyles.applyBtn} 
              onPress={() => {
                onApply(tempFilters);
                onClose();
              }}
            >
              <LinearGradient 
                colors={[colors.primaryGreen, '#1B5E20']} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={filterStyles.applyGradient}
              >
                <Text style={filterStyles.applyText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────

interface FilterOptions {
  minSkillMatch: number;
  minAvailability: number;
  minAreaMatch: number;
  minTotalScore: number;
  requiredSkills: string[];
}

const DEFAULT_FILTERS: FilterOptions = {
  minSkillMatch: 0,
  minAvailability: 0,
  minAreaMatch: 0,
  minTotalScore: 0,
  requiredSkills: [],
};

export const AssignmentScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<Tab>('Pending');
  const [refreshing, setRefreshing] = useState(false);
  const [reasoningMatch, setReasoningMatch] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [activeAssignmentForTasks, setActiveAssignmentForTasks] = useState<VolunteerAssignment | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    assignments, loadAssignments, respondAssignment,
    loadingAssignments, volunteerId,
    acceptedAssignments, pastAssignments,
    volunteerProfile, liveMatches, loadLiveMatches,
    joinMatch,
  } = useEventStore();

  useEffect(() => {
    loadAssignments(volunteerId);
    loadLiveMatches(volunteerId);
  }, [volunteerId]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadAssignments(volunteerId),
      loadLiveMatches(volunteerId),
    ]);
    setRefreshing(false);
  };

  const pendingAssignments = (assignments || []).filter(a => a.status === 'pending');

  // ── Reactive Filtering Logic ────────────────────────────────────────────────
  const filteredData = React.useMemo(() => {
    const applyFilter = (item: any) => {
      const breakdown = item.score_breakdown || {};
      const score = (item.match_score || 0) * 100;
      
      const skillPct = breakdown.skill_match_pct || 0;
      const availPct = breakdown.availability_pct || 0;
      const areaPct = breakdown.area_match_pct || 0;

      // 1. Threshold Filters
      if (skillPct < filters.minSkillMatch) return false;
      if (availPct < filters.minAvailability) return false;
      if (areaPct < filters.minAreaMatch) return false;
      if (score < filters.minTotalScore) return false;

      // 2. Specific Skill Match (OR logic)
      if (filters.requiredSkills.length > 0) {
        const itemSkills = item.matched_skills || item.volunteer_skills || [];
        const hasSkill = filters.requiredSkills.some(s => itemSkills.includes(s));
        if (!hasSkill) return false;
      }

      return true;
    };

    return {
      pending: pendingAssignments.filter(applyFilter),
      live: (liveMatches || []).filter(applyFilter)
    };
  }, [pendingAssignments, liveMatches, filters]);

  const activeFilterCount = Object.entries(filters).reduce((acc, [key, val]) => {
    if (key === 'requiredSkills') return acc + (val as string[]).length;
    if (typeof val === 'number' && val > 0) return acc + 1;
    return acc;
  }, 0);

  const rawPendingCount = pendingAssignments.length + (liveMatches || []).length;
  const pendingCount = filteredData.live.length + filteredData.pending.length;
  const acceptedList = acceptedAssignments();
  const pastList = pastAssignments();

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Assignments"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const count = tab === 'Pending' ? pendingCount
            : tab === 'Accepted' ? acceptedList.length
            : pastList.length;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab}</Text>
              {count > 0 && (
                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loadingAssignments && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={[typography.captionText, { marginTop: spacing.sm }]}>Loading assignments…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} />}
        >
          {activeTab === 'Pending' && (
            <>
              {rawPendingCount === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📡</Text>
                  <Text style={styles.emptyTitle}>No Pending Missions</Text>
                  <Text style={styles.emptySubtitle}>
                    There are no live events matching your profile at the moment. 
                    Update your skills or check back when a supervisor dispatches a new mission.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Feather name="zap" size={13} color={colors.primaryGreen} />
                      <Text style={styles.sectionHeaderText}>
                        {pendingCount} mission{pendingCount !== 1 ? 's' : ''} shown
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} 
                      onPress={() => setShowFilters(true)}
                    >
                      <Feather name="filter" size={14} color={activeFilterCount > 0 ? '#fff' : colors.primaryGreen} />
                      <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#fff' }]}>Filter</Text>
                      {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}>
                          <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Active Filters Row */}
                  {activeFilterCount > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                      {Object.entries(filters).map(([key, val]) => {
                        if (key === 'requiredSkills') {
                          return (val as string[]).map(s => (
                            <TouchableOpacity key={s} style={styles.activeFilterChip} onPress={() => setFilters(f => ({ ...f, requiredSkills: f.requiredSkills.filter(x => x !== s) }))}>
                              <Text style={styles.activeFilterChipText}>{s.replace('_', ' ')}</Text>
                              <Feather name="x" size={10} color={colors.primaryGreen} />
                            </TouchableOpacity>
                          ));
                        }
                        if (typeof val === 'number' && val > 0) {
                          const label = key === 'minSkillMatch' ? 'Skills' : key === 'minAvailability' ? 'Avail' : key === 'minAreaMatch' ? 'Area' : 'Score';
                          return (
                            <TouchableOpacity key={key} style={styles.activeFilterChip} onPress={() => setFilters(f => ({ ...f, [key]: 0 }))}>
                              <Text style={styles.activeFilterChipText}>{label} &gt; {val}%</Text>
                              <Feather name="x" size={10} color={colors.primaryGreen} />
                            </TouchableOpacity>
                          );
                        }
                        return null;
                      })}
                      <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)}>
                        <Text style={[styles.filterBtnText, { color: colors.error, marginLeft: 8 }]}>Clear All</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                  
                  {/* 1. Show Direct Assignments first */}
                  {(filteredData.pending || []).map((assign) => (
                    <MissionCard
                      key={assign.id}
                      data={assign}
                      isDirect={true}
                      currentSkills={volunteerProfile?.skills ?? []}
                      onAccept={async () => await respondAssignment(assign.id, 'accepted')}
                      onDecline={async () => await respondAssignment(assign.id, 'declined')}
                      onViewReasoning={() => {
                        Haptics.selectionAsync();
                        setReasoningMatch(assign);
                      }}
                      navigation={navigation}
                    />
                  ))}

                  {/* 2. Show AI Suggested matches */}
                  {(filteredData.live || []).map((match) => (
                    <MissionCard
                      key={match.event_id}
                      data={match}
                      isDirect={false}
                      currentSkills={volunteerProfile?.skills ?? []}
                      onAccept={async () => {
                         await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                         await joinMatch(match.event_id, volunteerId, 'accepted', match.match_score, match.score_breakdown);
                      }}
                      onDecline={async () => {
                         await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                         await joinMatch(match.event_id, volunteerId, 'declined', match.match_score, match.score_breakdown);
                      }}
                      onViewReasoning={() => {
                        Haptics.selectionAsync();
                        setReasoningMatch(match);
                      }}
                      navigation={navigation}
                    />
                  ))}

                  {pendingCount === 0 && (
                    <View style={styles.noResults}>
                      <Feather name="search" size={40} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                      <Text style={styles.noResultsTitle}>No results for these filters</Text>
                      <Text style={styles.noResultsSub}>Try relaxing your thresholds or selecting fewer skills.</Text>
                      <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setFilters(DEFAULT_FILTERS)}>
                        <Text style={styles.clearFiltersText}>Reset All Filters</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'Accepted' && (
            <>
              {acceptedList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyTitle}>No Accepted Assignments</Text>
                  <Text style={styles.emptySubtitle}>Missions you accept will appear here.</Text>
                </View>
              ) : acceptedList.map((a) => (
                <HistoryCard 
                  key={a.id} 
                  assignment={a} 
                  onViewTasks={() => setActiveAssignmentForTasks(a)}
                />
              ))}
            </>
          )}

          {activeTab === 'Past' && (
            <>
              {pastList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📁</Text>
                  <Text style={styles.emptyTitle}>No Past Assignments</Text>
                  <Text style={styles.emptySubtitle}>Your declined assignment history will appear here.</Text>
                </View>
              ) : pastList.map((a) => (
                <HistoryCard 
                  key={a.id} 
                  assignment={a} 
                  onViewTasks={() => setActiveAssignmentForTasks(a)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* AI Reasoning Modal */}
      <ReasoningModal
        visible={!!reasoningMatch}
        reasoning={reasoningMatch?.ai_reasoning ?? ''}
        eventName={reasoningMatch?.event_type ?? ''}
        scoreBreakdown={reasoningMatch?.score_breakdown}
        onClose={() => setReasoningMatch(null)}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        filters={filters}
        onApply={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onClose={() => setShowFilters(false)}
        availableSkills={Object.keys(SKILL_ICONS)}
      />

      {/* Volunteer Tasks Modal */}
      <VolunteerTaskModal
        visible={!!activeAssignmentForTasks}
        assignment={activeAssignmentForTasks!}
        onClose={() => setActiveAssignmentForTasks(null)}
      />
    </View>
  );
};

// ── Harmonized Mission Card Component ──────────────────────────────────────────

const MissionCard = ({ data, isDirect, currentSkills, onAccept, onDecline, onViewReasoning, navigation }: {
  data: any;
  isDirect: boolean;
  currentSkills: string[];
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  onViewReasoning: () => void;
  navigation: any;
}) => {
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const matchPct = Math.round((data.match_score || 0) * 100);
  const barColor = matchPct >= 75 ? ['#2E7D32', '#66BB6A'] as const
    : matchPct >= 55 ? ['#FBC02D', '#FFD54F'] as const
    : ['#E65100', '#FF8C42'] as const;

  const matchLabel = matchPct >= 75 ? 'Excellent Match' : matchPct >= 55 ? 'Good Match' : 'Partial Match';
  const matchLabelColor = matchPct >= 75 ? colors.success : matchPct >= 55 ? colors.primarySaffron : colors.warning;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <View style={[globalStyles.card, styles.card, isDirect && styles.directCard]}>
        
        {/* Header Block */}
        <View style={styles.cardHeader}>
          {isDirect ? (
             <View style={{ flex: 1 }}>
               <View style={styles.directBadge}>
                 <Text style={styles.directBadgeText}>🎯 DIRECT ASSIGNMENT</Text>
               </View>
               <Text style={styles.eventType}>{data.event_type}</Text>
               <Text style={styles.eventArea}><Feather name="map-pin" size={11} /> {data.volunteer_area || data.area}</Text>
             </View>
          ) : (
            <>
              <Text style={styles.categoryIcon}>{CATEGORY_ICONS[data.category] || '📋'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventType}>{data.event_type}</Text>
                <Text style={styles.eventArea}><Feather name="map-pin" size={11} /> {data.area}</Text>
              </View>
            </>
          )}
            <View style={[styles.matchBadge, { backgroundColor: matchLabelColor + '20' }]}>
              <Text style={[styles.matchBadgeText, { color: matchLabelColor }]}>{matchLabel}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Chat', {
                volunteer_id: data.volunteer_id,
                supervisor_id: 'sup_deepak_1',
                event_id: data.event_id,
                recipient_name: 'Deepak Chawla (Supervisor)',
                volunteer_name: 'Me',
                supervisor_name: 'Deepak Chawla (Supervisor)',
                event_name: data.event_type,
                metadata: {
                  event_name: data.event_type,
                  event_description: data.event_description || 'Mission details related to ' + data.event_type,
                  match_score: matchPct,
                  area: data.volunteer_area || 'Nagpur',
                  skills: data.volunteer_skills || []
                }
              })}
              style={styles.chatIconBtn}
            >
              <Feather name="message-circle" size={22} color={colors.primaryGreen} />
              <View style={styles.chatBadge} />
            </TouchableOpacity>
          </View>

        {isDirect && (
          <Text style={styles.directDescription}>
            The supervisor has specifically selected you for this mission based on your profile.
          </Text>
        )}

        {/* AI Match Score Bar */}
        <View style={styles.matchRow}>
          <Text style={styles.matchLabel}>AI Match Score</Text>
          <Text style={[styles.matchValue, { color: matchLabelColor }]}>{matchPct}%</Text>
        </View>
        <View style={styles.matchBarBg}>
          <LinearGradient colors={barColor} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.matchBarFill, { width: `${matchPct}%` as any }]} />
        </View>

        {/* Event Timing Details */}
        <View style={styles.detailRow}>
          <Feather name="calendar" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>{data.event_date_start} → {data.event_date_end}</Text>
        </View>

        {/* Skill Matching Section */}
        <View style={styles.skillsSection}>
           <Text style={styles.skillsHeader}>Your Matching Skills</Text>
           <View style={styles.skillsRow}>
              {/* Matched Skills */}
              {(data.matched_skills || (Array.isArray(data.volunteer_skills) ? data.volunteer_skills : []).filter((s: string) => (data.event_required_skills || []).includes(s))).length > 0 ? 
                (data.matched_skills || (Array.isArray(data.volunteer_skills) ? data.volunteer_skills : []).filter((s: string) => (data.event_required_skills || []).includes(s))).map((s: string) => (
                <View key={s} style={[styles.skillChip, styles.skillChipMatch]}>
                  <Text style={styles.skillChipTextMatch}>{SKILL_ICONS[s] || '✅'} {s.replace('_', ' ')}</Text>
                </View>
              )) : (
                <Text style={styles.noMatchText}>General Volunteer Required</Text>
              )}
           </View>
        </View>

        {/* Technical Score Breakdown */}
        <View style={styles.breakdownRow}>
          {Object.entries(data.score_breakdown || {}).map(([key, val]: any) => (
            <View key={key} style={styles.breakdownItem}>
              <Text style={styles.breakdownVal}>{val}%</Text>
              <Text style={styles.breakdownLabel}>{key.replace('_pct', '').replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>

        {/* View AI Reasoning Button */}
        <TouchableOpacity style={styles.reasoningBtn} onPress={onViewReasoning} disabled={loading}>
          <LinearGradient colors={['#1A237E', '#3949AB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.reasoningBtnGradient}>
            <Feather name="cpu" size={14} color="#fff" />
            <Text style={styles.reasoningBtnText}>View AI Reasoning</Text>
            <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Final Actions Block */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.declineBtn} 
            onPress={() => handleAction(onDecline)} 
            disabled={loading}
          >
            <Feather name="x" size={16} color={colors.error} />
            <Text style={styles.declineBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.acceptBtn, isDirect && { backgroundColor: '#1A237E' }]} 
            onPress={() => handleAction(onAccept)} 
            disabled={loading}
          >
            <LinearGradient 
              colors={isDirect ? ['#1A237E', '#283593'] : ['#2E7D32', '#1B5E20']} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.acceptGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.acceptBtnText}>{isDirect ? 'Accept Mission' : 'Join Mission'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </View>
    </Animated.View>
  );
};

// ── History Card (Accepted / Past) ─────────────────────────────────────────────

const HistoryCard = ({ assignment, onViewTasks }: { 
  assignment: VolunteerAssignment;
  onViewTasks?: () => void;
}) => {
  const isAccepted = assignment.status === 'accepted';
  const color = isAccepted ? colors.success : colors.error;
  const label = isAccepted ? '✅ Accepted' : '❌ Declined';

  return (
    <View style={[globalStyles.card, styles.card]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventType}>{assignment.event_type}</Text>
          <Text style={styles.eventArea}>{assignment.event_date_start} → {assignment.event_date_end}</Text>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.matchBadgeText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Feather name="map-pin" size={13} color={colors.textSecondary} />
        <Text style={styles.detailText}>{assignment.volunteer_area || 'Area TBD'}</Text>
      </View>
      <View style={styles.breakdownRow}>
        {Object.entries(assignment.score_breakdown || {}).map(([key, val]) => (
          <View key={key} style={styles.breakdownItem}>
            <Text style={styles.breakdownVal}>{val}%</Text>
            <Text style={styles.breakdownLabel}>{key.replace('_pct', '').replace(/_/g, ' ')}</Text>
          </View>
        ))}
      </View>

      {isAccepted && (
        <TouchableOpacity style={styles.viewTasksBtn} onPress={onViewTasks}>
          <Feather name="list" size={14} color={colors.primaryGreen} />
          <Text style={styles.viewTasksBtnText}>View Mission Tasks</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Volunteer Task Modal ───────────────────────────────────────────────────────

const VolunteerTaskModal = ({ visible, assignment, onClose }: {
  visible: boolean;
  assignment: VolunteerAssignment;
  onClose: () => void;
}) => {
  const { tasks, loadTasks, completeTask, loadingAction } = useEventStore();
  
  useEffect(() => {
    if (visible && assignment) {
      loadTasks(assignment.id);
    }
  }, [visible, assignment]);

  const assignmentTasks = assignment ? tasks[assignment.id] || [] : [];

  const handleComplete = async (taskId: string, proofRequired: boolean) => {
    if (proofRequired) {
      Alert.alert(
        "Proof Attachment Required",
        "Select the type of proof you want to attach.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Image or Video", 
            onPress: async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
              });
              if (!res.canceled && res.assets && res.assets[0]) {
                const asset = res.assets[0];
                const proofUrl = await uploadGenericFile(asset.uri, asset.fileName || 'proof_media', asset.mimeType || 'image/jpeg');
                if (proofUrl) {
                  await completeTask(taskId, assignment.id, proofUrl);
                  Alert.alert("Submitted", "Your proof has been submitted for review.");
                } else {
                  Alert.alert("Upload Failed", "Could not upload the attachment. Please try again.");
                }
              }
            } 
          },
          {
            text: "Document / PDF",
            onPress: async () => {
              const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
              });
              if (!res.canceled && res.assets && res.assets[0]) {
                const asset = res.assets[0];
                const proofUrl = await uploadGenericFile(asset.uri, asset.name, asset.mimeType || 'application/pdf');
                if (proofUrl) {
                  await completeTask(taskId, assignment.id, proofUrl);
                  Alert.alert("Submitted", "Your document has been submitted for review.");
                } else {
                  Alert.alert("Upload Failed", "Could not upload the document. Please try again.");
                }
              }
            }
          }
        ]
      );
    } else {
      await completeTask(taskId, assignment.id);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Mission Tasks</Text>
              <Text style={styles.modalSub}>{assignment.event_type}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {assignmentTasks.length === 0 ? (
              <View style={styles.emptyTasks}>
                <Feather name="clipboard" size={48} color={colors.textSecondary} style={{ opacity: 0.2 }} />
                <Text style={styles.emptyTasksText}>No specific tasks assigned for this mission yet.</Text>
              </View>
            ) : (
              assignmentTasks.map((t) => (
                <View key={t.id} style={styles.taskItem}>
                  <View style={styles.taskMain}>
                    <Text style={[styles.taskDesc, (t.status === 'under_review' || t.status === 'completed') && styles.taskDescDone]}>
                      {t.description}
                    </Text>
                    {t.proof_required && t.status === 'pending' && (
                      <Text style={styles.proofNote}>📌 Proof required (photo/document)</Text>
                    )}
                    {t.status === 'under_review' && (
                      <View style={styles.completedRow}>
                        <Feather name="clock" size={14} color={colors.warning} />
                        <Text style={[styles.completedText, { color: colors.warning }]}>Under Review</Text>
                      </View>
                    )}
                    {t.status === 'completed' && (
                      <View style={styles.completedRow}>
                        <Feather name="check-circle" size={14} color={colors.success} />
                        <Text style={styles.completedText}>Completed</Text>
                      </View>
                    )}
                    {t.status === 'rejected' && (
                      <View style={styles.completedRow}>
                        <Feather name="alert-triangle" size={14} color={colors.error} />
                        <Text style={[styles.completedText, { color: colors.error }]}>Proof Rejected - Please Re-submit</Text>
                      </View>
                    )}
                  </View>
                  
                  {(t.status === 'pending' || t.status === 'rejected') && (
                    <TouchableOpacity 
                      style={[styles.completeTaskBtn, t.status === 'rejected' && { backgroundColor: colors.error }]} 
                      onPress={() => handleComplete(t.id, t.proof_required)}
                      disabled={loadingAction}
                    >
                      <Text style={styles.completeTaskBtnText}>{t.status === 'rejected' ? 'Re-submit' : 'Submit'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeFullBtn} onPress={onClose}>
            <Text style={styles.closeFullBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: 12, padding: spacing.xs, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  activeTab: { backgroundColor: colors.primaryGreen },
  tabText: { ...typography.bodyText, color: colors.textSecondary, fontWeight: '500' as const },
  activeTabText: { color: '#fff', fontWeight: '700' as const },
  badge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeInactive: { backgroundColor: colors.primaryGreen + '20' },
  badgeText: { fontSize: 10, color: colors.primaryGreen, fontWeight: '700' as const },
  badgeTextActive: { color: '#fff' },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, paddingHorizontal: 4 },
  sectionHeaderText: { fontSize: 12, color: colors.primaryGreen, fontWeight: '600' as const },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 52, marginBottom: spacing.md },
  emptyTitle: { ...typography.headingSmall, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: { marginBottom: spacing.md, borderRadius: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  categoryIcon: { fontSize: 28 },
  eventType: { fontSize: 15, fontWeight: '700' as const, color: colors.textPrimary },
  eventArea: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  matchBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  matchBadgeText: { fontSize: 11, fontWeight: '600' as const },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  matchLabel: { ...typography.captionText },
  matchValue: { fontSize: 12, fontWeight: '700' as const },
  matchBarBg: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginBottom: spacing.sm, overflow: 'hidden' },
  matchBarFill: { height: '100%', borderRadius: 3 },
  fillBarBg: { height: 4, backgroundColor: '#E8F5E9', borderRadius: 2, marginBottom: spacing.sm, overflow: 'hidden' },
  fillBarFill: { height: '100%', backgroundColor: colors.primaryGreen, borderRadius: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailText: { ...typography.captionText, flex: 1 },
  chatIconBtn: {
    padding: spacing.xs,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  skillsSection: { marginTop: spacing.sm, padding: spacing.sm, backgroundColor: '#F8F9FA', borderRadius: 12 },
  skillsHeader: { fontSize: 9, fontWeight: '700' as const, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  skillChipMatch: { backgroundColor: colors.success + '15', borderColor: colors.success + '40' },
  skillChipRequired: { backgroundColor: 'transparent', borderColor: '#E0E0E0', borderStyle: 'dashed' as const },
  skillChipTextMatch: { fontSize: 10, color: colors.success, fontWeight: '600' as const },
  skillChipTextRequired: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' as const },
  noMatchText: { fontSize: 10, color: colors.textSecondary, fontStyle: 'italic' as const },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  breakdownItem: { alignItems: 'center' },
  breakdownVal: { fontSize: 13, fontWeight: '700' as const, color: colors.textPrimary },
  breakdownLabel: { fontSize: 9, color: colors.textSecondary, textAlign: 'center', maxWidth: 60 },
  reasoningBtn: { marginTop: spacing.sm, borderRadius: 10, overflow: 'hidden' },
  reasoningBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  reasoningBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: 10, borderWidth: 1.5, borderColor: colors.error },
  declineBtnText: { color: colors.error, fontWeight: '600' as const, fontSize: 14 },
  acceptBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  acceptGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm },
  acceptBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  directCard: { borderLeftWidth: 6, borderLeftColor: '#1A237E', backgroundColor: '#F0F2FF' },
  directBadge: { backgroundColor: '#1A237E', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  directBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' as const },
  directDescription: { fontSize: 12, color: colors.textPrimary, fontStyle: 'italic', marginBottom: spacing.sm, lineHeight: 18 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.primaryGreen + '40', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterBtnActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: colors.primaryGreen },
  filterBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.error, borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  activeFiltersRow: { marginBottom: spacing.sm, maxHeight: 36 },
  activeFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryGreen + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryGreen + '20' },
  activeFilterChipText: { fontSize: 11, color: colors.primaryGreen, fontWeight: '600' },
  noResults: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  noResultsTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  noResultsSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  clearFiltersBtn: { marginTop: spacing.md, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primaryGreen + '10' },
  clearFiltersText: { color: colors.primaryGreen, fontWeight: '700' },

  // Mission Task Styles
  viewTasksBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  viewTasksBtnText: { fontSize: 13, fontWeight: '700' as const, color: colors.primaryGreen },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: colors.textPrimary },
  modalSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  modalCloseBtn: { padding: 4 },
  taskItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  taskMain: { flex: 1, marginRight: spacing.md },
  taskDesc: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' as const },
  taskDescDone: { textDecorationLine: 'line-through', color: colors.textSecondary, opacity: 0.6 },
  proofNote: { fontSize: 11, color: colors.accentBlue, fontWeight: '600' as const, marginTop: 4 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  completedText: { fontSize: 12, color: colors.success, fontWeight: '700' as const },
  completeTaskBtn: { backgroundColor: colors.primaryGreen, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  completeTaskBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
  emptyTasks: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: spacing.xl },
  emptyTasksText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, opacity: 0.6 },
  closeFullBtn: { backgroundColor: colors.textPrimary, paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center', marginTop: spacing.md },
  closeFullBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', overflow: 'hidden' },
  header: { padding: spacing.lg, paddingBottom: spacing.md, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  closeBtn: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 6 },
  body: { padding: spacing.lg, paddingBottom: 40 },
  scoreBanner: { borderWidth: 2, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, backgroundColor: '#FAFAFA' },
  scoreBannerText: { fontSize: 16, fontWeight: '800' as const, textAlign: 'center' },
  reasonRow: { borderLeftWidth: 3, paddingLeft: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reasonIcon: { fontSize: 16, marginTop: 1 },
  reasonText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  doneBtn: { backgroundColor: colors.primaryGreen, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: spacing.md },
  doneBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
});

const filterStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  resetText: { fontSize: 14, color: colors.error, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  thresholdContainer: { marginBottom: 20 },
  thresholdLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  thresholdOptions: { flexDirection: 'row', gap: 8 },
  thresholdOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#F8F9FA' },
  thresholdOptionActive: { backgroundColor: colors.primaryGreen + '10', borderColor: colors.primaryGreen },
  thresholdOptionText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  thresholdOptionTextActive: { color: colors.primaryGreen },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: 'transparent' },
  skillChipActive: { backgroundColor: colors.primaryGreen + '10', borderColor: colors.primaryGreen },
  skillIcon: { fontSize: 14 },
  skillName: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  skillNameActive: { color: colors.primaryGreen, fontWeight: '700' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#fff' },
  applyBtn: { borderRadius: 12, overflow: 'hidden' },
  applyGradient: { paddingVertical: 14, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
