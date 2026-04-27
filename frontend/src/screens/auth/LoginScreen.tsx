import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { PrimaryButton, MadeInIndiaBadge, GradientBackground, IconButton, AshokaChakra, StatusModal } from '../../components';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useAuthStore } from '../../services/store/useAuthStore';
import { firebaseAuthService } from '../../services/auth/firebaseAuthService';
import { useLanguage } from '../../context/LanguageContext';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const LoginScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuthStore();
  const { t } = useLanguage();
  const isExpoGo = Constants.appOwnership === 'expo';
  const role = route.params?.role || 'CITIZEN';

  const redirectUri = AuthSession.makeRedirectUri();
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      extraParams: { nonce: Math.random().toString(36).substring(7) },
    },
    { authorizationEndpoint: GOOGLE_AUTH_ENDPOINT }
  );

  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = (googleResponse as any).params?.id_token;
      if (idToken) handleGoogleLogin(idToken);
      else showError(t('common.error'), 'Google sign-in succeeded but no ID token was returned.');
    } else if (googleResponse?.type === 'error') {
      showError(t('common.error'), googleResponse.error?.message || 'Google sign-in failed');
      setLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleLoginClick = async () => {
    setLoading(true);
    try {
      console.log('[GoogleAuth] Prompting Google sign-in via expo-auth-session...');
      await promptGoogleAsync();
    } catch (err: any) {
      showError(t('common.error'), err.message);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (idToken: string, accessToken?: string) => {
    setLoading(true);
    try {
      const result = await loginWithGoogle(idToken, role, accessToken);
      if (!result.success) {
        showError(t('auth.loginError'), result.message);
      }
    } catch (err: any) {
      showError(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'error' as 'error' | 'success', title: '', message: '' });

  const showError = (title: string, message: string) => {
    console.log('[Login] Showing error:', title, message);
    setModalConfig({ type: 'error', title, message });
    setModalVisible(true);
  };

  const handleLogin = async () => {
    console.log('[Login] Attempting login for:', email);
    setLoading(true);
    try {
      const result = await login(email, password);
      console.log('[Login] Result:', result.success);
      if (!result.success) {
        showError(t('auth.loginError'), result.message);
      }
    } catch (err: any) {
      console.error('[Login] Unexpected error:', err);
      showError(t('common.error'), err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };


  const handleModalClose = () => {
    setModalVisible(false);
    // Only redirect for login errors, not for forgot password success
    if (modalConfig.type === 'error') {
      // Stay on login screen — user can try again
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          <View style={styles.header}>
            <SafeAreaView>
              <View style={styles.topRow}>
                <IconButton 
                  iconName="arrow-left" 
                  iconColor="#FFFFFF" 
                  onPress={() => navigation.goBack()} 
                  style={styles.backBtn}
                />
                <LanguageToggle />
              </View>
              <Animated.View 
                entering={FadeInUp.delay(200).springify()}
                style={styles.headerContent}
              >
                <AshokaChakra size={60} color="#FFFFFF" opacity={0.2} style={styles.headerChakra} />
                <Text style={styles.title}>{t('auth.loginTitle')}</Text>
                <Text style={styles.subtitle}>
                  {t('auth.loginSubtitle')}
                </Text>
              </Animated.View>
            </SafeAreaView>
          </View>

          <View style={styles.content}>
            <Animated.View 
              entering={FadeInDown.delay(400).springify()}
              style={styles.formCard}
            >
              <View style={styles.roleIndicator}>
                <Ionicons 
                  name={role === 'SUPERVISOR' ? 'business' : role === 'VOLUNTEER' ? 'heart' : 'people'} 
                  size={16} 
                  color={colors.primarySaffron} 
                />
                <Text style={styles.roleIndicatorText}>
                  {t('auth.loginAs')} {role === 'SUPERVISOR' ? t('auth.ngoSupervisor') : t(`auth.${role.toLowerCase()}`)}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    keyboardType="email-address"
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    secureTextEntry
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>

              <PrimaryButton 
                title={loading ? t('auth.loggingIn') : t('auth.loginButton')} 
                onPress={handleLogin} 
                style={styles.loginBtn}
                disabled={!email || !password || loading}
              />
              
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.otpBtn} 
                onPress={() => navigation.navigate('OtpLogin', { role })}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={colors.navyBlue} />
                <Text style={styles.otpBtnText}>{t('auth.loginWithOtp')}</Text>
              </TouchableOpacity>

              {isExpoGo ? (
                // Google Sign-in requires production APK with registered SHA-1.
                // However, we can try the manual flow for testing if redirect URIs are correct.
                <TouchableOpacity 
                  style={[styles.otpBtn, { marginTop: 12, borderColor: '#4285F4' }]} 
                  onPress={handleGoogleLoginClick}
                  disabled={loading || !googleRequest}
                >
                  {loading ? (
                    <ActivityIndicator color="#4285F4" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="logo-google" size={18} color="#4285F4" />
                      <Text style={[styles.otpBtnText, { color: '#4285F4' }]}>{t('auth.continueWithGoogle')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.otpBtn, { marginTop: 12, borderColor: '#4285F4' }]} 
                  onPress={handleGoogleLoginClick}
                  disabled={loading || !googleRequest}
                >
                  {loading ? (
                    <ActivityIndicator color="#4285F4" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="logo-google" size={18} color="#4285F4" />
                      <Text style={[styles.otpBtnText, { color: '#4285F4' }]}>{t('auth.continueWithGoogle')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(600).springify()}
              style={styles.registerContainer}
            >
              <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Register', { role })}>
                 <Text style={styles.registerLink}>{t('auth.signUp')}</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <MadeInIndiaBadge />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusModal
        visible={modalVisible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleModalClose}
        buttonText={t('common.retry')}
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1A237E',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 60,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 0) + 15,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  headerContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: 10,
  },
  headerChakra: {
    position: 'absolute',
    top: -20,
  },
  title: {
    ...typography.displayTitle,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyText,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
    maxWidth: '80%',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    marginTop: -40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 12,
    marginBottom: spacing.xl,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySaffron + '15',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  roleIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primarySaffron,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navyBlue,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navyBlue,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primarySaffron,
  },
  loginBtn: {
    height: 56,
    borderRadius: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BDBDBD',
    paddingHorizontal: 16,
  },
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  otpBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyBlue,
    marginLeft: 10,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primarySaffron,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
    paddingBottom: 20,
  },
});

