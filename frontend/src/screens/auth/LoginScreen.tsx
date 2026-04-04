import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Platform, StatusBar, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { PrimaryButton, MadeInIndiaBadge, GradientBackground } from '../../components';
import { useAuthStore } from '../../services/store/useAuthStore';

export const LoginScreen = ({ onSelectRole }: { onSelectRole?: (role: any) => void }) => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  
  const role = route.params?.role || 'CITIZEN';
  const displayRole = role === 'SUPERVISOR' ? 'NGO Supervisor' : role.charAt(0) + role.slice(1).toLowerCase();
  
  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        Alert.alert('Login Failed', result.message);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.headerGradient}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={styles.brandingHeader}>
              <Ionicons name="shield-checkmark" size={40} color={colors.cardBackground} style={styles.logoIcon} />
              <Text style={styles.title}>SevaSetu</Text>
            </View>
            <Text style={styles.subtitle}>
              Login to continue as {displayRole}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        <View style={[globalStyles.card, styles.formCard]}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              keyboardType="email-address"
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary + '80'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary + '80'}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <PrimaryButton 
            title={loading ? "Verifying..." : "Login"} 
            onPress={handleLogin} 
            style={styles.loginBtn}
            disabled={!email || !password || loading}
          />
          
          {/* OTP Link Alternative */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.otpBtn} 
            onPress={() => navigation.navigate('OtpLogin', { role })}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={colors.accentBlue} />
            <Text style={styles.otpBtnText}>Login with OTP</Text>
          </TouchableOpacity>
        </View>

        {/* Registration Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Register')}>
             <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.lg }}>
          <MadeInIndiaBadge />
        </View>

      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl * 1.5,
    alignItems: 'center',
  },
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoIcon: {
    marginRight: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    ...typography.headingLarge,
    color: colors.cardBackground,
    fontSize: 40,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...typography.bodyText,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    marginTop: -spacing.xl,
  },
  formCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  inputLabel: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    borderRadius: 12,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background, // slight contrast against the card
    height: 52,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.bodyText,
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
    marginTop: -spacing.sm, // pull up closer to password input
  },
  forgotPasswordText: {
    ...typography.captionText,
    color: colors.accentBlue,
    fontWeight: '600',
  },
  loginBtn: {
    width: '100%',
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.textSecondary + '20',
  },
  dividerText: {
    ...typography.captionText,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentBlue + '40',
    borderRadius: 12,
    backgroundColor: colors.accentBlue + '0A',
  },
  otpBtnText: {
    ...typography.headingSmall,
    color: colors.accentBlue,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typography.bodyText,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.bodyText,
    color: colors.primarySaffron,
    fontWeight: '700',
  },
});
