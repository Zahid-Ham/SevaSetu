import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { GradientBackground, SectionTitle, MissionCard, StatCard, GradientButton, UserAvatar, DynamicText } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { MOCK_CITIZEN_STATS, MOCK_MISSIONS } from '../../services/mock';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';

export const HomeScreen = () => {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const recentMissions = MOCK_MISSIONS.slice(0, 1);
  const userName = user?.name || t('auth.roles.CITIZEN');

  return (
    <GradientBackground variant="dashboard" style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>{t('citizen.home.greeting')}</Text>
          <DynamicText text={userName} style={styles.userNameText} />
        </View>
        <View style={styles.avatarWrapper}>
          <UserAvatar name={userName} size={54} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <SectionTitle title={t('citizen.home.quickActions')} />
          <View style={styles.quickActions}>
            <GradientButton 
              title={t('citizen.home.reportIssue')} 
              icon="alert-circle"
              onPress={() => {}} 
              style={{ flex: 1, marginRight: spacing.sm }} 
            />
            <GradientButton 
              title={t('citizen.home.requestHelp')} 
              icon="life-buoy"
              onPress={() => {}} 
              style={{ flex: 1, marginLeft: spacing.sm }} 
            />
          </View>

          <SectionTitle title={t('citizen.home.recentActivity')} />
          <View style={styles.statsRow}>
            <StatCard title={t('citizen.home.issuesReported')} value={MOCK_CITIZEN_STATS.issuesReported} iconName="alert-circle" style={styles.card} />
            <StatCard title={t('citizen.home.helpRequests')} value={MOCK_CITIZEN_STATS.helpRequests} iconName="life-buoy" iconColor={colors.accentBlue} style={styles.card} />
          </View>

          <SectionTitle title={t('citizen.home.localUpdates')} />
          {recentMissions.map(m => (
            <View key={m.id} style={{ paddingHorizontal: spacing.xl }}>
              <MissionCard 
                title={m.title}
                description={m.description}
                location={m.location}
                urgency={m.urgency}
                onPress={() => {}}
              />
            </View>
          ))}
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
  avatarWrapper: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 30,
    padding: 2,
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: spacing.xl,
    minHeight: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
  },
});

