import { useLanguage } from '../../context/LanguageContext';
import { getBilingualText } from '../../utils/bilingualHelpers';
import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GradientBackground, SectionTitle, MissionCard, StatCard, GradientButton, UserAvatar, DynamicText } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { MOCK_MISSIONS, MOCK_VOLUNTEER_STATS } from '../../services/mock';
import { useEventStore } from '../../services/store/useEventStore';
import { useChatStore } from '../../services/store/useChatStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { reportStorage } from '../../services/storage/reportStorage';

export const VolunteerHomeScreen = () => {
  const { t, language } = useLanguage();
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

  const { role, user } = useAuthStore();
  const { rooms, loadRooms } = useChatStore();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const currentUserId = user?.id || volunteerId;

  const checkSyncQueue = async () => {
    const queue = await reportStorage.getSyncQueue();
    setPendingSyncCount(queue.length);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (currentUserId) {
        loadAssignments(currentUserId);
        loadVolunteerProfile(currentUserId);
        loadPredictions();
        loadLiveMatches(currentUserId);
        loadRooms(currentUserId);
      }
      checkSyncQueue();
    }, [currentUserId])
  );

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);

  const pendingList = typeof pendingAssignments === 'function' ? pendingAssignments() : [];
  const pendingCount = pendingList.length;
  
  const displayName = (!volunteerProfile?.name || volunteerProfile?.name === 'Volunteer') 
    ? (user?.name || "Volunteer") 
    : volunteerProfile.name;
  const userName = displayName;

  return (
    <GradientBackground variant="dashboard" style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>{t('volunteer.home.greeting')},</Text>
          <DynamicText 
            style={styles.userNameText} 
            text={userName} 
            collection="users"
            docId={currentUserId}
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

          <TouchableOpacity 
            onPress={() => navigation.navigate('SyncDashboard')}
            style={styles.chatHeaderBtn}
          >
            <Feather name="cloud" size={24} color={pendingSyncCount > 0 ? colors.error : colors.primarySaffron} />
            {pendingSyncCount > 0 && (
              <View style={styles.chatBadge}>
                <DynamicText style={styles.chatBadgeText} text={pendingSyncCount.toString()} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatarWrapper}>
            <UserAvatar name={userName} size={54} />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <SectionTitle title={t('volunteer.home.quickActions')} />
          <View style={styles.quickActions}>
            <GradientButton 
              title={t('volunteer.home.myAssignments')} 
              icon="calendar"
              onPress={() => navigation.navigate('Assignments')} 
              style={{ flex: 1 }} 
              badge={pendingCount > 0 ? pendingCount.toString() : undefined}
            />
          </View>
          <View style={styles.quickActions}>
            <GradientButton 
              title={t('volunteer.home.availability')} 
              icon="clock"
              onPress={() => navigation.navigate('Availability')} 
              style={{ flex: 1, marginRight: spacing.sm }} 
            />
            <GradientButton 
              title={t('volunteer.home.verifyPassport')} 
              icon="user-check"
              onPress={() => navigation.navigate('VerifyPassport')} 
              style={{ flex: 1, marginLeft: spacing.sm }} 
            />
          </View>

          <SectionTitle title={t('volunteer.home.yourImpact')} />
          <View style={styles.statsRow}>
            <StatCard title={t('volunteer.home.hours')} value={MOCK_VOLUNTEER_STATS.hoursLogged.toString()} iconName="clock" style={styles.card} />
            <StatCard title={t('volunteer.home.tasksDone')} value={MOCK_VOLUNTEER_STATS.tasksCompleted.toString()} iconName="check-circle" iconColor={colors.success} style={styles.card} />
          </View>

          <SectionTitle title={t('volunteer.home.urgentMissions')} />
          <View style={styles.listContainer}>
            {pendingList.slice(0, 2).map((m: any) => {
              const typeStr = getBilingualText(m.event_type, language);
              const cardTitle = t(`demo.${typeStr}`) !== `demo.${typeStr}` ? t(`demo.${typeStr}`) : typeStr;
              return (
                <MissionCard 
                  key={m.id}
                  title={cardTitle}
                  description={m.event_description || t('volunteer.home.noUrgentSubtitle')}
                  location={m.volunteer_area}
                  urgency={m.urgency as any || "Medium"}
                  onPress={() => navigation.navigate('Assignments')}
                />
              );
            })}
            {pendingList.length === 0 && (
              <Text style={[typography.captionText, { textAlign: 'center', marginVertical: 20 }]}>
                {t('volunteer.home.noUrgentMissions')}
              </Text>
            )}
          </View>

          <SectionTitle title={t('volunteer.home.upcomingTrainings')} />
          <View style={{ paddingHorizontal: spacing.xl }}>
            <MissionCard 
              title={t('volunteer.home.firstAidTitle')}
              description={t('volunteer.home.firstAidDesc')}
              location={t('volunteer.home.online')}
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
    marginBottom: spacing.md,
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
  listContainer: {
    paddingHorizontal: spacing.xl,
  },
});

