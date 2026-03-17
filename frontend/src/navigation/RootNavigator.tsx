import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CitizenNavigator } from './CitizenNavigator';
import { VolunteerNavigator } from './VolunteerNavigator';
import { SupervisorNavigator } from './SupervisorNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '../services/store/useAuthStore';
import { colors, spacing, typography } from '../theme';

export const RootNavigator = () => {
  const { role, setRole, hasOnboarded } = useAuthStore();

  if (!role) {
    // Show the Authentication/Landing flow
    return <AuthNavigator onSelectRole={setRole} hasOnboarded={hasOnboarded} />;
  }

  // Render the appropriate navigator based on the selected role
  if (role === 'CITIZEN') return <CitizenNavigator />;
  if (role === 'VOLUNTEER') return <VolunteerNavigator />;
  if (role === 'SUPERVISOR') return <SupervisorNavigator />;

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: {
    marginBottom: spacing.sm,
    color: colors.primaryGreen,
  },
  subtitle: {
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.accentBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.cardBackground,
    fontWeight: '600',
    fontSize: 16,
  },
});
