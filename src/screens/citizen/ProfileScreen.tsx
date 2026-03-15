import React from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppHeader, UserAvatar, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';

export const ProfileScreen = () => {
  const logout = useAuthStore((state) => state.logout);
  const userName = "Zahid Khan";

  const renderOption = (icon: any, title: string, subtitle: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.optionItem} onPress={onPress}>
      <View style={styles.optionIconContainer}>
        <Feather name={icon} size={20} color={colors.accentBlue} />
      </View>
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="My Profile" rightIcon="settings" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          <View style={styles.avatarWrapper}>
            <UserAvatar name={userName} size={90} />
            <TouchableOpacity style={styles.editBadge}>
              <Feather name="edit-2" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={[typography.headingMedium, styles.name]}>{userName}</Text>
          <Text style={styles.roleText}>Verified Citizen • Member since June 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account Settings</Text>
          <View style={[globalStyles.card, styles.card]}>
            {renderOption('user', 'Personal Details', 'Email, Phone number, Address')}
            <View style={styles.separator} />
            {renderOption('lock', 'Privacy & Security', 'Change password, Biometrics')}
            <View style={styles.separator} />
            {renderOption('bell', 'Notifications', 'Push alerts, SMS preferences')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Community</Text>
          <View style={[globalStyles.card, styles.card]}>
            {renderOption('life-buoy', 'Support Center', 'Help desk, FAQs, Tutorials')}
            <View style={styles.separator} />
            {renderOption('shield', 'Guidelines', 'Community standards, Safety')}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out from App</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>SevaSetu v1.0.4 (Beta)</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  headerArea: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accentBlue,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  roleText: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.captionText,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentBlue + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyText,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionSubtitle: {
    ...typography.captionText,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.textSecondary + '10',
    marginLeft: 56,
  },
  logoutBtn: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  logoutText: {
    ...typography.bodyText,
    fontWeight: '700',
    color: colors.error,
    marginLeft: spacing.sm,
  },
  versionText: {
    ...typography.captionText,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    opacity: 0.5,
  },
});
