import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { AppHeader, UserAvatar, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';

export const VolunteerProfileScreen = () => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <View style={styles.container}>
      <AppHeader title="Volunteer Profile" rightIcon="settings" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerArea}>
          <UserAvatar name="Anita Sharma" size={80} />
          <Text style={[typography.headingMedium, styles.name]}>Anita Sharma</Text>
          <Text style={typography.captionText}>Volunteer • Tier 2 Badge</Text>
        </View>

        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>Assigned NGO</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Helping Hands Foundation</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Supervisor: Mr. Gupta</Text>
        </View>

        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>Badges Earned</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>🌟 First Responder</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>🤝 100+ Hours Contributed</Text>
        </View>
        
        <PrimaryButton title="Log Out" onPress={logout} style={styles.logoutBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  headerArea: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
    marginBottom: spacing.md,
  },
  name: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  detailItem: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  logoutBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    backgroundColor: colors.error,
  },
});
