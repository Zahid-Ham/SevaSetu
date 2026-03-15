import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { AppHeader, UserAvatar, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';

export const SupervisorProfileScreen = () => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <View style={styles.container}>
      <AppHeader title="Supervisor Profile" rightIcon="settings" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerArea}>
          <UserAvatar name="Deepak Chawla" size={80} />
          <Text style={[typography.headingMedium, styles.name]}>Deepak Chawla</Text>
          <Text style={typography.captionText}>Regional Supervisor • NGO Head</Text>
        </View>

        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>Organization Info</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Helping Hands Foundation</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Assigned Region: Delhi NCR</Text>
        </View>

        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>System Access</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Admin Priveleges: Granted</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>Reporting Level: Tier 1</Text>
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
