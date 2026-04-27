import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SectionTitle, StatCard, GradientButton, UserAvatar, SkeletonCard, GradientBackground, DynamicText } from '../../components';
import { useLanguage } from '../../context/LanguageContext';
import { colors, spacing, typography } from '../../theme';
import { MOCK_STATS } from '../../services/mock';
import { useEventStore } from '../../services/store/useEventStore';
import { PredictedEvent, MOCK_PREDICTIONS } from '../../services/api/eventPredictionService';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useChatStore } from '../../services/store/useChatStore';
import { useAuthStore } from '../../services/store/useAuthStore';

// ── Main screen ─────────────────────────────────────────────────────────────────

export const DashboardScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const { role, user } = useAuthStore();
  const { predictions, loadPredictions } = useEventStore();
  const { rooms, loadRooms } = useChatStore();

  const currentUserId = user?.id;

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      loadPredictions();
      if (currentUserId) loadRooms(currentUserId);
      const timer = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(timer);
    }, [currentUserId])
  );

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);

  const displayPredictions = predictions.length > 0 ? predictions : MOCK_PREDICTIONS;
  const activePredictions = displayPredictions.filter((p) => p.status !== 'dismissed');

  return (
    <GradientBackground variant="dashboard" style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>{t('supervisor.dashboard.greeting')}</Text>
          <DynamicText 
            style={styles.userNameText} 
            text={user?.name || "NGO Supervisor"} 
            collection="users"
            docId={user?.id || currentUserId}
            field="name"
          />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ChatList')}
            style={styles.chatHeaderBtn}
          >
            <Feather name="message-circle" size={24} color={colors.primarySaffron} />
            {totalUnread > 0 && (
              <View style={[styles.chatBadge, totalUnread > 9 && styles.chatBadgeWide]}>
                <Text style={styles.chatBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatarWrapper}>
            <UserAvatar name={user?.name || "Supervisor"} size={54} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <SectionTitle title={t('supervisor.dashboard.metrics')} />
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
                 <StatCard title={t('supervisor.dashboard.activeVolunteers')} value={MOCK_STATS.activeVolunteers.toString()} iconName="users" style={styles.gridCard} />
                 <StatCard title={t('supervisor.dashboard.openMissions')} value={MOCK_STATS.openMissions.toString()} iconName="crosshair" style={styles.gridCard} iconColor={colors.warning} />
                 <StatCard title={t('supervisor.dashboard.issuesReported')} value={MOCK_STATS.issuesReported.toString()} iconName="alert-triangle" style={styles.gridCard} iconColor={colors.error} />
                 <StatCard title={t('supervisor.dashboard.totalImpact')} value={MOCK_STATS.totalImpactHours} iconName="award" style={styles.gridCard} iconColor={colors.success} />
               </>
            )}
          </View>

          <SectionTitle title={t('supervisor.dashboard.operations')} />
          <View style={styles.actionsContainer}>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
              <GradientButton title={t('supervisor.dashboard.dispatch')} icon="send" onPress={() => navigation.navigate('AssignmentManager')} style={{ flex: 1 }} />
              <TouchableOpacity 
                style={styles.manualActionBtn}
                onPress={() => navigation.navigate('VerifyPassport')}
              >
                <Feather name="user-check" size={18} color={colors.primarySaffron} />
                <Text style={styles.manualActionText}>Verify Passport</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
              <GradientButton title={t('supervisor.dashboard.viewHeatmap')} icon="map" onPress={() => navigation.navigate('Crisis Heatmap')} style={{ flex: 1 }} />
              <TouchableOpacity 
                style={styles.manualActionBtn}
                onPress={() => navigation.navigate('ManualEvent')}
              >
                <Feather name="plus-circle" size={18} color={colors.primarySaffron} />
                <Text style={styles.manualActionText}>{t('supervisor.dashboard.manualEvent')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Impact Reports Section */}
          <View style={styles.forecastHeader}>
            <SectionTitle title={t('supervisor.impactReports.title')} />
            <TouchableOpacity onPress={() => navigation.navigate('ImpactReports')}>
               <Text style={styles.viewAllText}>{t('supervisor.dashboard.viewAll')}</Text>
            </TouchableOpacity>
            <View style={styles.forecastBadge}>
              <Text style={styles.forecastBadgeText}>{t('supervisor.impactReports.autoReport')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.reportsDashboardCard}
            onPress={() => navigation.navigate('ImpactReports')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              style={styles.reportsGradient}
            >
              <View style={styles.reportsIconContainer}>
                <Feather name="bar-chart-2" size={24} color={colors.primaryGreen} />
              </View>
              <View style={styles.reportsInfo}>
                <Text style={styles.reportsTitle}>{t('supervisor.impactReports.weeklyHighlights')}</Text>
                <Text style={styles.reportsSub}>{t('supervisor.impactReports.foodDrive')} • {t('supervisor.impactReports.mealsServed')}</Text>
              </View>
              <Feather name="arrow-right" size={20} color={colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    height: 200,
    zIndex: 1,
  },
  greetingHeader: {
    flexDirection: 'column',
  },
  greetingText: {
    ...typography.bodyText,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontWeight: '600',
  },
  userNameText: {
    ...typography.headingMedium,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 26,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrapper: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 30,
    padding: 2,
    marginLeft: 4,
  },
  chatHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 2,
  },
  chatBadgeWide: {
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  mainContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    minHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
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
    paddingLeft: spacing.sm,
  },
  viewAllText: {
    color: colors.primarySaffron,
    fontSize: 12,
    fontWeight: '800',
    marginRight: spacing.sm,
  },
  manualActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primarySaffron,
    backgroundColor: '#fff',
  },
  reportsDashboardCard: {
    marginHorizontal: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: spacing.xl,
  },
  reportsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: 15,
  },
  reportsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryGreen + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsInfo: {
    flex: 1,
  },
  reportsTitle: {
    ...typography.headingSmall,
    fontSize: 15,
    color: colors.textPrimary,
  },
  reportsSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manualActionText: {
    color: colors.primarySaffron,
    fontWeight: '800',
    fontSize: 14,
  },
});
