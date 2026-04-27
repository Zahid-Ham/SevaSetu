import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CitizenNavigator } from './CitizenNavigator';
import { VolunteerNavigator } from './VolunteerNavigator';
import { SupervisorNavigator } from './SupervisorNavigator';
import { AuthNavigator } from './AuthNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import { useAuthStore } from '../services/store/useAuthStore';
import { colors, spacing, typography } from '../theme';

export const RootNavigator = () => {
  const { role, user, logout, isLoading, hasOnboarded } = useAuthStore();

  // 1. Loading State
  if (isLoading && !role) {
    return <SplashScreen />;
  }

  // 2. Unauthenticated State
  if (!role) {
    return <AuthNavigator hasOnboarded={hasOnboarded} />;
  }

  // 3. Authenticated State - Normalize Role
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';
  const currentRole = normalizedRole.trim();

  // 4. Role-based Routing
  if (currentRole === 'CITIZEN') return <CitizenNavigator />;
  if (currentRole === 'VOLUNTEER') return <VolunteerNavigator />;
  if (currentRole === 'SUPERVISOR') return <SupervisorNavigator />;

  // 5. Fallback for Unexpected Roles (Prevents White Screen)
  return (
    <View style={styles.container}>
      <Text style={[typography.headingMedium, styles.title]}>Unknown Account Type</Text>
      <Text style={[typography.bodyText, styles.subtitle, { textAlign: 'center' }]}>
        Your account role ({role}) is not recognized. Please contact support or try logging out.
      </Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
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
