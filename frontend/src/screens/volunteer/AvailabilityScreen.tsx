/**
 * AvailabilityScreen.tsx
 * Volunteer marks their available dates on a monthly calendar grid.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '../../services/store/useEventStore';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader } from '../../components';
import { useLanguage } from '../../context/LanguageContext';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const AvailabilityScreen = ({ navigation }: any) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const { volunteerProfile, loadVolunteerProfile, saveVolunteerProfile, loadingAction, volunteerId } = useEventStore();
  const { t } = useLanguage();
  const MONTHS = t('calendar.months', { returnObjects: true }) || ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS_OF_WEEK = t('calendar.days', { returnObjects: true }) || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    loadVolunteerProfile(volunteerId);
  }, []);

  useEffect(() => {
    if (volunteerProfile?.available_dates) {
      setSelectedDates(new Set(volunteerProfile.available_dates));
    }
  }, [volunteerProfile]);

  const navigateMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const toggleDate = (dateStr: string) => {
    Haptics.selectionAsync();
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
    setIsDirty(true);
  };

  const clearMonth = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      for (let d = 1; d <= daysInMonth; d++) {
        next.delete(toDateString(viewYear, viewMonth, d));
      }
      return next;
    });
    setIsDirty(true);
  };

  const selectAllweekdays = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(viewYear, viewMonth, d).getDay();
        if (day !== 0 && day !== 6) {
          next.add(toDateString(viewYear, viewMonth, d));
        }
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    const profile = volunteerProfile ?? {
      volunteer_id: volunteerId,
      name: 'Anita Sharma',
      skills: [],
      area: '',
      available_dates: [],
      is_available: true,
      fatigue_score: 0,
    };
    await saveVolunteerProfile({
      ...profile,
      volunteer_id: volunteerId,
      available_dates: Array.from(selectedDates),
    });
    setIsDirty(false);
    Alert.alert(t('volunteer.availability.saved'), t('volunteer.availability.updated'));
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedInThisMonth = Array.from(selectedDates).filter((d: string) =>
    d.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)
  ).length;

  return (
    <View style={styles.container}>
      <AppHeader 
        title={t('volunteer.availability.title')} 
        showBack={true} 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info card */}
        <View style={[globalStyles.card, styles.infoCard]}>
          <Feather name="info" size={16} color={colors.accentBlue} />
          <Text style={styles.infoText}>
            {t('volunteer.availability.info')}
          </Text>
        </View>

        {/* Month navigator */}
        <View style={[globalStyles.card, styles.card]}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navBtn}>
              <Feather name="chevron-left" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.monthTitleGroup}>
              <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Text style={styles.monthSub}>{selectedInThisMonth} {t('volunteer.availability.daysSelected')}</Text>
            </View>
            <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navBtn}>
              <Feather name="chevron-right" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Quick actions */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={selectAllweekdays}>
              <Text style={styles.quickBtnText}>{t('volunteer.availability.allWeekdays')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, styles.quickBtnRed]} onPress={clearMonth}>
              <Text style={[styles.quickBtnText, { color: colors.error }]}>{t('volunteer.availability.clearMonth')}</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayHeaderRow}>
            {DAYS_OF_WEEK.map((d) => (
              <Text key={d} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={`empty-${idx}`} style={styles.dayCell} />;

              const dateStr = toDateString(viewYear, viewMonth, day);
              const isSelected = selectedDates.has(dateStr);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                    isPast && styles.pastCell,
                  ]}
                  onPress={() => !isPast && toggleDate(dateStr)}
                  disabled={isPast}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#2E7D32', '#1B5E20']}
                      style={styles.selectedGradient}
                    >
                      <Text style={styles.selectedDayText}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.dayText, isPast && styles.pastDayText, isToday && styles.todayText]}>
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primaryGreen }]} />
            <Text style={styles.legendText}>{t('calendar.available')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
            <Text style={styles.legendText}>{t('calendar.notSelected')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primarySaffron, borderWidth: 2, borderColor: colors.primarySaffron }]} />
            <Text style={styles.legendText}>{t('calendar.today')}</Text>
          </View>
        </View>

        {/* Summary */}
        {selectedDates.size > 0 && (
          <View style={[globalStyles.card, styles.summaryCard]}>
            <Text style={styles.summaryTitle}>📅 {t('volunteer.availability.totalDays')}</Text>
            <Text style={styles.summaryCount}>{selectedDates.size}</Text>
            <Text style={styles.summarySub}>{t('volunteer.availability.acrossMonths')}</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || loadingAction}
          style={[styles.saveBtn, (!isDirty || loadingAction) && styles.saveBtnDisabled]}
        >
          <LinearGradient
            colors={isDirty && !loadingAction ? ['#2E7D32', '#1B5E20'] : ['#9E9E9E', '#757575']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            {loadingAction
              ? <ActivityIndicator color="#fff" />
              : <><Feather name="save" size={18} color="#fff" /><Text style={styles.saveBtnText}>{t('volunteer.availability.save')}</Text></>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.accentBlue + '10', borderWidth: 1, borderColor: colors.accentBlue + '30' },
  infoText: { flex: 1, ...typography.captionText, lineHeight: 18, color: colors.accentBlue },
  card: { marginBottom: spacing.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { padding: spacing.sm },
  monthTitleGroup: { alignItems: 'center' },
  monthTitle: { ...typography.headingSmall },
  monthSub: { ...typography.captionText, color: colors.primaryGreen, marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primaryGreen + '15', borderWidth: 1, borderColor: colors.primaryGreen + '30' },
  quickBtnRed: { backgroundColor: colors.error + '10', borderColor: colors.error + '30' },
  quickBtnText: { fontSize: 12, fontWeight: '600' as const, color: colors.primaryGreen },
  dayHeaderRow: { flexDirection: 'row', marginBottom: spacing.sm },
  dayHeader: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, color: colors.textSecondary, fontWeight: '600' as const },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  todayCell: { borderWidth: 2, borderColor: colors.primarySaffron, borderRadius: 21 },
  selectedCell: { borderRadius: 21, overflow: 'hidden' },
  pastCell: { opacity: 0.35 },
  selectedGradient: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' as const },
  selectedDayText: { fontSize: 14, color: '#fff', fontWeight: '700' as const },
  pastDayText: { color: colors.textSecondary },
  todayText: { color: colors.primarySaffron, fontWeight: '700' as const },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...typography.captionText },
  summaryCard: { alignItems: 'center', marginBottom: spacing.md, backgroundColor: colors.primaryGreen + '08' },
  summaryTitle: { ...typography.bodyText, fontWeight: '600' as const, color: colors.primaryGreen },
  summaryCount: { fontSize: 40, fontWeight: '700' as const, color: colors.primaryGreen, marginVertical: spacing.xs },
  summarySub: { ...typography.captionText },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: spacing.sm },
  saveBtnDisabled: { opacity: 0.6 },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
});
