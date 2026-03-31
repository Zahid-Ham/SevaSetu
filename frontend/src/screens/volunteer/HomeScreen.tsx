import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { GradientBackground, SectionTitle, MissionCard, StatCard, GradientButton, UserAvatar } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { MOCK_MISSIONS, MOCK_VOLUNTEER_STATS } from '../../services/mock';
import { useEventStore } from '../../services/store/useEventStore';

export const VolunteerHomeScreen = () => {
  const navigation = useNavigation<any>();
  const { 
    unreadCount, 
    pendingAssignments, 
    volunteerProfile, 
    volunteerId,
    loadAssignments, 
    loadPredictions, 
    loadVolunteerProfile,
    loadLiveMatches,
    liveMatches,
  } = useEventStore();

  React.useEffect(() => {
    if (volunteerId) {
      loadAssignments(volunteerId);
      loadVolunteerProfile(volunteerId);
      loadPredictions();
      loadLiveMatches(volunteerId);  // Real-time matching
    }
  }, [volunteerId]);

  const urgentMissions = (Array.isArray(MOCK_MISSIONS) ? MOCK_MISSIONS : []).filter(m => m.urgency === 'High');
  const pendingCount = (typeof pendingAssignments === 'function' ? pendingAssignments() : []).length;
  const userName = volunteerProfile?.name || "Volunteer";

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
              title="My Assignments" 
              icon="calendar"
              onPress={() => navigation.navigate('Assignments')} 
              style={{ flex: 1, marginRight: spacing.sm }} 
              badge={pendingCount > 0 ? pendingCount.toString() : undefined}
            />
            <GradientButton 
              title="Availability" 
              icon="clock"
              onPress={() => navigation.navigate('Availability')} 
              style={{ flex: 1, marginLeft: spacing.sm }} 
            />
          </View>
          <View style={styles.quickActions}>
            <GradientButton 
              title="Report Help" 
              icon="life-buoy"
              onPress={() => {}} 
              style={{ flex: 1, marginRight: spacing.sm }} 
            />
            <GradientButton 
              title="Post Update" 
              icon="edit-3"
              onPress={() => {}} 
              style={{ flex: 1, marginLeft: spacing.sm }} 
            />
          </View>

          <SectionTitle title="Your Impact" />
          <View style={styles.statsRow}>
            <StatCard title="Hours" value={MOCK_VOLUNTEER_STATS.hoursLogged.toString()} iconName="clock" style={styles.card} />
            <StatCard title="Tasks Done" value={MOCK_VOLUNTEER_STATS.tasksCompleted.toString()} iconName="check-circle" iconColor={colors.success} style={styles.card} />
          </View>

          <SectionTitle title="Urgent Missions" />
          <View style={styles.listContainer}>
            {urgentMissions.map(m => (
              <MissionCard 
                key={m.id}
                title={m.title}
                description={m.description}
                location={m.location}
                urgency={m.urgency}
                onPress={() => {}}
              />
            ))}
          </View>

          <SectionTitle title="Upcoming Trainings" />
          <View style={{ paddingHorizontal: spacing.md }}>
            <MissionCard 
              title="First Aid Certification"
              description="Mandatory CPR and basic first aid training."
              location="Online"
              urgency="Low"
              onPress={() => {}}
            />
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    marginRight: spacing.xs,
  },
  listContainer: {
    paddingHorizontal: spacing.xl,
  },
});
