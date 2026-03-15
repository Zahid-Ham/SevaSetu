import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SectionTitle, StatCard, GradientButton, UserAvatar, SkeletonCard, GradientBackground } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { MOCK_STATS } from '../../services/mock';

export const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate real network request fetching dashboard data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GradientBackground variant="dashboard" style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>Good Morning,</Text>
          <Text style={typography.headingMedium}>Deepak Chawla</Text>
        </View>
        <UserAvatar name="Deepak Chawla" size={48} />
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
            <GradientButton title="Dispatch Team" icon="send" onPress={() => {}} style={styles.actionBtn} />
            <GradientButton title="Generate Report" icon="file-text" onPress={() => {}} style={styles.actionBtn} />
          </View>
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
    marginTop: -20, // Negative margin to overlap header
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
});
