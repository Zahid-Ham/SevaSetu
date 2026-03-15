import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { GradientBackground, SectionTitle, MissionCard, StatCard, GradientButton, UserAvatar } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { MOCK_CITIZEN_STATS, MOCK_MISSIONS } from '../../services/mock';

export const HomeScreen = () => {
  const recentMissions = MOCK_MISSIONS.slice(0, 1); // Get 1 sample mission
  const userName = "Zahid Khan"; // Placeholder name

  return (
    <GradientBackground variant="dashboard" style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>Good Morning,</Text>
          <Text style={typography.headingMedium}>{userName}</Text>
        </View>
        <UserAvatar name={userName} size={48} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <SectionTitle title="Quick Actions" />
          <View style={styles.quickActions}>
            <GradientButton 
              title="Report Issue" 
              icon="alert-circle"
              onPress={() => {}} 
              style={{ flex: 1, marginRight: spacing.sm }} 
            />
            <GradientButton 
              title="Request Help" 
              icon="life-buoy"
              onPress={() => {}} 
              style={{ flex: 1, marginLeft: spacing.sm }} 
            />
          </View>

          <SectionTitle title="Your Recent Activity" />
          <StatCard title="Issues Reported" value={MOCK_CITIZEN_STATS.issuesReported} iconName="alert-circle" style={styles.card} />
          <StatCard title="Help Requests" value={MOCK_CITIZEN_STATS.helpRequests} iconName="life-buoy" iconColor={colors.accentBlue} style={styles.card} />

          <SectionTitle title="Local Updates" />
          {recentMissions.map(m => (
            <View key={m.id} style={{ paddingHorizontal: spacing.md }}>
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
});
