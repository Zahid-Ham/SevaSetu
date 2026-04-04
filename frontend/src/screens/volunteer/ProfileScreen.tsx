/**
 * ProfileScreen.tsx (Volunteer)
 * Extended with skill chips, area field, and availability toggle.
 */

import React, { useEffect, useState } from 'react';
import {
  ScrollView, StyleSheet, View, Text, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppHeader, UserAvatar, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useEventStore } from '../../services/store/useEventStore';
import { useNavigation } from '@react-navigation/native';

const ALL_SKILLS = [
  { id: 'first_aid',        label: 'First Aid',      icon: '🩺' },
  { id: 'medical',          label: 'Medical',         icon: '💊' },
  { id: 'logistics',        label: 'Logistics',       icon: '📦' },
  { id: 'driving',          label: 'Driving',         icon: '🚗' },
  { id: 'teaching',         label: 'Teaching',        icon: '📚' },
  { id: 'construction',     label: 'Construction',    icon: '🔧' },
  { id: 'documentation',    label: 'Documentation',   icon: '📝' },
  { id: 'cooking',          label: 'Cooking',         icon: '🍳' },
  { id: 'crowd_management', label: 'Crowd Mgmt',      icon: '👥' },
  { id: 'counseling',       label: 'Counseling',      icon: '💬' },
];

export const VolunteerProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { role, user, logout } = useAuthStore();
  const { 
    volunteerProfile, 
    loadVolunteerProfile, 
    saveVolunteerProfile, 
    loadingAction, 
    volunteerId,
    setVolunteerId,
    loadAssignments,
    loadLiveMatches,
  } = useEventStore();

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // If we have a user from auth but no volunteerId set in event store yet, fix it
    const targetId = volunteerId || user?.id || '';
    if (targetId) {
      loadVolunteerProfile(targetId);
    }
  }, [volunteerId, user?.id]);

  const displayName = volunteerProfile?.name || user?.name || "Volunteer";
  const displayNgo = user?.ngo_name || "Helping Hands Foundation";

  useEffect(() => {
    if (volunteerProfile) {
      setSelectedSkills(Array.isArray(volunteerProfile.skills) ? volunteerProfile.skills : []);
      setArea(volunteerProfile.area || '');
      setIsAvailable(volunteerProfile.is_available ?? true);
    }
  }, [volunteerProfile]);

  const toggleSkill = (skillId: string) => {
    Haptics.selectionAsync();
    setSelectedSkills((prev) =>
      (Array.isArray(prev) ? prev : []).includes(skillId) 
        ? prev.filter((s) => s !== skillId) 
        : [...(Array.isArray(prev) ? prev : []), skillId]
    );
    setIsDirty(true);
  };

  const handleSave = async () => {
    await saveVolunteerProfile({
      volunteer_id: volunteerId,
      name: volunteerProfile?.name || 'Volunteer',
      skills: selectedSkills,
      area,
      available_dates: volunteerProfile?.available_dates ?? [],
      is_available: isAvailable,
      fatigue_score: volunteerProfile?.fatigue_score ?? 0,
    });
    // Immediately re-run live matching with updated profile
    await loadLiveMatches(volunteerId);
    setIsDirty(false);
    Alert.alert('Saved!', 'Your profile has been updated. Your pending matches have been refreshed.');
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Volunteer Profile" rightIcon="settings" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerArea}>
          <UserAvatar name={displayName} size={80} />
          <Text style={[typography.headingMedium, styles.name]}>{displayName}</Text>
          <Text style={typography.captionText}>Volunteer • Tier 2 Badge</Text>
          {/* Availability toggle */}
          <TouchableOpacity
            style={[styles.availToggle, isAvailable ? styles.availOn : styles.availOff]}
            onPress={() => { setIsAvailable((v) => !v); setIsDirty(true); }}
          >
            <View style={[styles.availDot, isAvailable ? styles.availDotOn : styles.availDotOff]} />
            <Text style={[styles.availText, isAvailable ? styles.availTextOn : styles.availTextOff]}>
              {isAvailable ? 'Available for Events' : 'Unavailable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* NGO Info */}
        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>Assigned NGO</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>{displayNgo}</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Supervisor: Mr. Gupta</Text>
        </View>

        {/* Area field */}
        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>Your Area</Text>
          <Text style={styles.fieldHint}>Used to match you with nearby events</Text>
          <View style={styles.inputWrapper}>
            <Feather name="map-pin" size={16} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={area}
              onChangeText={(v) => { setArea(v); setIsDirty(true); }}
              placeholder="e.g. Nashik, Maharashtra"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Skills section */}
        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>Your Skills</Text>
          <Text style={styles.fieldHint}>Select all skills you have — the engine uses these to match events</Text>
          <View style={styles.skillsGrid}>
            {ALL_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill.id);
              return (
                <TouchableOpacity
                  key={skill.id}
                  style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                  onPress={() => toggleSkill(skill.id)}
                >
                  {isSelected ? (
                    <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.skillGradient}>
                      <Text style={styles.skillEmojiSelected}>{skill.icon}</Text>
                      <Text style={styles.skillTextSelected}>{skill.label}</Text>
                    </LinearGradient>
                  ) : (
                    <>
                      <Text style={styles.skillEmoji}>{skill.icon}</Text>
                      <Text style={styles.skillText}>{skill.label}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedSkills.length > 0 && (
            <View style={styles.selectedCount}>
              <Feather name="check-circle" size={13} color={colors.success} />
              <Text style={styles.selectedCountText}>{selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''} selected</Text>
            </View>
          )}
        </View>

        {/* Fatigue meter */}
        {volunteerProfile && (
          <View style={[globalStyles.card, styles.card]}>
            <Text style={typography.headingSmall}>Workload Balance</Text>
            <Text style={styles.fieldHint}>Prevents back-to-back over-assignment</Text>
            <View style={styles.fatigueRow}>
              <Text style={styles.fatigueLabel}>Fatigue Score</Text>
              <Text style={[styles.fatigueValue, {
                color: (volunteerProfile.fatigue_score ?? 0) >= 4 ? colors.error
                  : (volunteerProfile.fatigue_score ?? 0) >= 2 ? colors.warning
                  : colors.success
              }]}>
                {volunteerProfile.fatigue_score ?? 0} / 5
              </Text>
            </View>
            <View style={styles.fatigueBarBg}>
              <LinearGradient
                colors={(volunteerProfile.fatigue_score ?? 0) >= 4 ? ['#D32F2F', '#EF5350'] : (volunteerProfile.fatigue_score ?? 0) >= 2 ? ['#F9A825', '#FDD835'] : ['#2E7D32', '#66BB6A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.fatigueBarFill, { width: `${((volunteerProfile.fatigue_score ?? 0) / 5) * 100}%` as any }]}
              />
            </View>
          </View>
        )}

        {/* Calendar Link */}
        <TouchableOpacity 
          style={[globalStyles.card, styles.calendarLinkCard]}
          onPress={() => navigation.navigate('Availability')}
        >
          <View style={styles.calendarLinkContent}>
            <View style={styles.calendarIconBg}>
              <Feather name="calendar" size={20} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.calendarLinkTitle}>Availability Calendar</Text>
              <Text style={styles.calendarLinkSub}>Mark dates you are free for volunteering</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Debug Account Switcher (Only for Dev Testing) */}
        <View style={[globalStyles.card, styles.debugCard]}>
          <Text style={[typography.headingSmall, { color: colors.primarySaffron }]}>🛠️ Debug Account Switcher</Text>
          <Text style={styles.fieldHint}>Instantly swap between test accounts to verify skills-based matching.</Text>
          <View style={styles.debugGrid}>
            {[
              { id: 'vol_kavya_iyer',    label: 'Kavya Iyer',      icon: 'KI' },
              { id: 'vol_mithali_raj',   label: 'Mithali Raj',     icon: 'MR' },
              { id: 'vol_rohan_bopanna', label: 'Rohan Bopanna',   icon: 'RB' },
              { id: 'vol_zara_sheikh',   label: 'Zara Sheikh',     icon: 'ZS' },
            ].map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accBtn, volunteerId === acc.id && styles.accBtnActive]}
                onPress={async () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setVolunteerId(acc.id);
                  await Promise.all([
                    loadVolunteerProfile(acc.id),
                    loadAssignments(acc.id),
                    loadLiveMatches(acc.id),  // Refresh matching for new account
                  ]);
                }}
              >
                <Text style={styles.accIcon}>{acc.icon}</Text>
                <Text style={[styles.accLabel, volunteerId === acc.id && styles.accLabelActive]}>{acc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        {isDirty && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loadingAction}>
            <LinearGradient colors={['#2E7D32', '#1B5E20']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
              {loadingAction
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="save" size={18} color="#fff" /><Text style={styles.saveBtnText}>Save Profile</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>
        )}

        <PrimaryButton title="Log Out" onPress={logout} style={styles.logoutBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl },
  headerArea: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', marginBottom: spacing.md },
  name: { marginTop: spacing.md, marginBottom: spacing.xs },
  availToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1.5 },
  availOn: { borderColor: colors.success, backgroundColor: colors.success + '15' },
  availOff: { borderColor: colors.textSecondary, backgroundColor: '#F0F0F0' },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availDotOn: { backgroundColor: colors.success },
  availDotOff: { backgroundColor: colors.textSecondary },
  availText: { fontSize: 13, fontWeight: '600' as const },
  availTextOn: { color: colors.success },
  availTextOff: { color: colors.textSecondary },
  card: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  detailItem: { marginTop: spacing.sm, color: colors.textSecondary },
  fieldHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: spacing.sm, marginTop: spacing.xs },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.sm, fontSize: 14, color: colors.textPrimary },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', overflow: 'hidden', backgroundColor: '#F9F9F9' },
  skillChipSelected: { borderColor: colors.primaryGreen },
  skillGradient: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  skillEmoji: { fontSize: 16, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  skillText: { paddingRight: spacing.sm, fontSize: 12, fontWeight: '500' as const, color: colors.textPrimary },
  skillEmojiSelected: { fontSize: 16 },
  skillTextSelected: { fontSize: 12, fontWeight: '600' as const, color: '#fff', paddingRight: spacing.sm },
  selectedCount: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  selectedCountText: { fontSize: 12, color: colors.success, fontWeight: '600' as const },
  fatigueRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  fatigueLabel: { ...typography.captionText },
  fatigueValue: { fontSize: 13, fontWeight: '700' as const },
  fatigueBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  fatigueBarFill: { height: '100%', borderRadius: 4 },
  saveBtn: { marginHorizontal: spacing.md, borderRadius: 14, overflow: 'hidden', marginBottom: spacing.md },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  logoutBtn: { marginHorizontal: spacing.md, marginTop: spacing.sm, backgroundColor: colors.error },
  debugCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primarySaffron + '40', backgroundColor: colors.primarySaffron + '08' },
  debugGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  accBtn: { flexBasis: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' },
  accBtnActive: { borderColor: colors.primarySaffron, backgroundColor: colors.primarySaffron + '10', borderWidth: 2 },
  accIcon: { fontSize: 16 },
  accLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  accLabelActive: { color: colors.primarySaffron },
  calendarLinkCard: { 
    marginHorizontal: spacing.md, 
    marginBottom: spacing.md, 
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryGreen + '30',
    backgroundColor: colors.primaryGreen + '05',
  },
  calendarLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calendarIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGreen + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarLinkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calendarLinkSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
