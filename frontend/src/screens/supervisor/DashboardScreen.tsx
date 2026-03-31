import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SectionTitle, StatCard, GradientButton, UserAvatar, SkeletonCard, GradientBackground } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { MOCK_STATS } from '../../services/mock';
import { useEventStore } from '../../services/store/useEventStore';
import { PredictedEvent, MOCK_PREDICTIONS } from '../../services/api/eventPredictionService';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const TIER_COLORS: Record<string, { dot: string; gradient: readonly [string, string] }> = {
  high:   { dot: '#66BB6A', gradient: ['#1B5E20', '#2E7D32'] as const },
  medium: { dot: '#FFD54F', gradient: ['#E65100', '#F57F17'] as const },
  low:    { dot: '#90CAF9', gradient: ['#1A237E', '#3949AB'] as const },
};

// Small preview card shown in the horizontal scroll on the dashboard
const ForecastPreviewCard = ({ event }: { event: PredictedEvent }) => {
  const cfg = TIER_COLORS[event.tier] ?? TIER_COLORS.low;
  const pct = Math.round(event.confidence_score * 100);

  return (
    <View style={previewStyles.card}>
      <LinearGradient colors={cfg.gradient} style={previewStyles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[previewStyles.dot, { backgroundColor: cfg.dot }]} />
          <Text style={previewStyles.pctText}>{pct}%</Text>
        </View>
        {event.status === 'confirmed' && (
          <Text style={previewStyles.confirmedTag}>✅ Confirmed</Text>
        )}
      </LinearGradient>
      <View style={previewStyles.body}>
        <Text style={previewStyles.eventType} numberOfLines={2}>{event.event_type}</Text>
        <Text style={previewStyles.area} numberOfLines={1}>
          <Feather name="map-pin" size={10} /> {event.area}
        </Text>
        <Text style={previewStyles.date}>{event.predicted_date_start}</Text>
        <View style={previewStyles.skillsRow}>
          {event.required_skills.slice(0, 2).map((s) => (
            <View key={s} style={previewStyles.skillChip}>
              <Text style={previewStyles.skillChipText}>{s.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const previewStyles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  topBar: { padding: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pctText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  confirmedTag: { fontSize: 9, color: '#fff' },
  body: { padding: spacing.sm },
  eventType: { fontSize: 13, fontWeight: '700' as const, color: colors.textPrimary, marginBottom: 4 },
  area: { fontSize: 10, color: colors.textSecondary, marginBottom: 3 },
  date: { fontSize: 10, color: colors.primaryGreen, fontWeight: '600' as const, marginBottom: 5 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  skillChip: { backgroundColor: colors.primaryGreen + '15', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  skillChipText: { fontSize: 9, color: colors.primaryGreen, fontWeight: '600' as const },
});

// ── Main screen ─────────────────────────────────────────────────────────────────

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const { predictions, loadPredictions } = useEventStore();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    loadPredictions();
    return () => clearTimeout(timer);
  }, []);

  const displayPredictions = predictions.length > 0 ? predictions : MOCK_PREDICTIONS;
  const activePredictions = displayPredictions.filter((p) => p.status !== 'dismissed');

  return (
    <GradientBackground variant="dashboard" style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>Good Morning,</Text>
          <Text style={typography.headingMedium}>Deepak Chawla</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ChatList')}
            style={styles.chatHeaderBtn}
          >
            <Feather name="message-circle" size={24} color={colors.primaryGreen} />
            <View style={styles.chatBadge} />
          </TouchableOpacity>
          <UserAvatar name="Deepak Chawla" size={48} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <SectionTitle title="Real-time Metrics" />
          <View style={styles.metricsGrid}>
            {loading ? (
               <>
                 <SkeletonCard style={styles.gridCard} />
                 <SkeletonCard style={styles.gridCard} />
                 <SkeletonCard style={styles.gridCard} />
                 <SkeletonCard style={styles.gridCard} />
               </>
            ) : (
               <>
                 <StatCard title="Active Volunteers" value={MOCK_STATS.activeVolunteers.toString()} iconName="users" style={styles.gridCard} />
                 <StatCard title="Open Missions" value={MOCK_STATS.openMissions.toString()} iconName="crosshair" style={styles.gridCard} iconColor={colors.warning} />
                 <StatCard title="Issues Reported" value={MOCK_STATS.issuesReported.toString()} iconName="alert-triangle" style={styles.gridCard} iconColor={colors.error} />
                 <StatCard title="Total Impact (Hrs)" value={MOCK_STATS.totalImpactHours} iconName="award" style={styles.gridCard} iconColor={colors.success} />
               </>
            )}
          </View>

          <SectionTitle title="Operations" />
          <View style={styles.actionsContainer}>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
              <GradientButton title="Dispatch" icon="send" onPress={() => navigation.navigate('AssignmentManager')} style={{ flex: 1 }} />
              <TouchableOpacity 
                style={styles.manualActionBtn}
                onPress={() => navigation.navigate('ManualEvent')}
              >
                <Feather name="plus-circle" size={18} color={colors.primaryGreen} />
                <Text style={styles.manualActionText}>Manual Event</Text>
              </TouchableOpacity>
            </View>
            <GradientButton title="View Crisis Heatmap" icon="map" onPress={() => navigation.navigate('Crisis Heatmap')} style={styles.actionBtn} />
          </View>

          {/* AI Forecast Preview */}
          <View style={styles.forecastHeader}>
            <SectionTitle title="🔮 AI Event Forecast" />
            <TouchableOpacity onPress={() => navigation.navigate('EventForecast')}>
               <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
            <View style={styles.forecastBadge}>
              <Text style={styles.forecastBadgeText}>{activePredictions.length} events</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastScroll}
          >
            {activePredictions.slice(0, 5).map((evt) => (
              <ForecastPreviewCard key={evt.id} event={evt} />
            ))}
            {/* Trailing spacer */}
            <View style={{ width: spacing.md }} />
          </ScrollView>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    height: 180,
    zIndex: 1,
  },
  greetingHeader: {
    flexDirection: 'column',
  },
  greetingText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  mainContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: spacing.xl,
    minHeight: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  gridCard: {
    width: '46%',
    margin: '2%',
  },
  actionsContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  actionBtn: {
    marginBottom: spacing.md,
  },
  secondaryBtn: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.xl,
  },
  forecastBadge: {
    backgroundColor: colors.primarySaffron + '20',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  forecastBadgeText: {
    fontSize: 11,
    color: colors.primarySaffron,
    fontWeight: '700' as const,
  },
  forecastScroll: {
    paddingBottom: spacing.md,
  },
  viewAllText: {
    color: colors.primaryGreen,
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  manualActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryGreen,
    backgroundColor: '#fff',
  },
  manualActionText: {
    color: colors.primaryGreen,
    fontWeight: '700',
    fontSize: 14,
  },
  chatHeaderBtn: {
    padding: 8,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
