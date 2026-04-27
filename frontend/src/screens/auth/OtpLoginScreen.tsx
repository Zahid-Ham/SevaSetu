import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { PrimaryButton, MadeInIndiaBadge, GradientBackground, StatusModal } from '../../components';
import { firebaseAuthService } from '../../services/auth/firebaseAuthService';
import { useAuthStore, AppUser } from '../../services/store/useAuthStore';
import { FirebaseRecaptchaVerifierModal } from '../../components/FirebaseRecaptcha';
import { auth } from '../../config/firebaseConfig';
import { useLanguage } from '../../context/LanguageContext';

export const OtpLoginScreen = ({ onSelectRole }: { onSelectRole?: (role: any) => void }) => {
  const navigation = useNavigation<any>();
  const { sendOtp, verifyOtp } = useAuthStore();
  const { t } = useLanguage();
  const route = useRoute<any>();
  const role = route.params?.role || 'CITIZEN';
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'error' as const, title: '', message: '' });

  const otpAnimation = useRef(new Animated.Value(0)).current;
  const recaptchaVerifier = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (isOtpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, timer]);

  const showError = (title: string, message: string) => {
    console.log('[OTP] Showing error:', title, message);
    setModalConfig({ type: 'error', title, message });
    setModalVisible(true);
  };

  const handleSendOtp = async () => {
    if (phoneNumber.length === 10) {
      console.log('[OTP] Sending OTP to:', phoneNumber);
      setLoading(true);
      try {
        console.log('[OTP] Sending to:', phoneNumber);
        console.log('[OTP] Verifier Status:', recaptchaVerifier.current ? 'Ready' : 'Not Ready');
        
        if (!recaptchaVerifier.current) {
          showError('Error', 'Recaptcha verifier is not ready. Please wait a moment and try again.');
          return;
        }

        const result = await sendOtp(phoneNumber, recaptchaVerifier.current);
        console.log('[OTP] Send Result:', result.success);
        if (result.success) {
          setConfirmation(result.confirmation);
          setIsOtpSent(true);
          setStep('OTP'); // Switch to the OTP input screen
          Animated.timing(otpAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        } else {
          showError(t('common.error'), result.message || t('auth.otp.failedSend'));
        }
      } catch (err: any) {
        console.error('[OTP] Send Error Object:', JSON.stringify(err, null, 2));
        console.error('[OTP] Error Code:', err.code);
        console.error('[OTP] Error Message:', err.message);
        
        let friendlyMessage = err.message || t('auth.otp.error');
        if (err.code === 'auth/unauthorized-domain') {
          friendlyMessage = 'This domain is not authorized. Please check your Firebase Authorized Domains.';
        } else if (err.code === 'auth/invalid-app-credential') {
          friendlyMessage = 'Invalid app credentials. This often happens in Expo Go. Try a test phone number.';
        }
        
        showError(t('common.error'), friendlyMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const [step, setStep] = useState<'PHONE' | 'OTP' | 'PROFILE'>('PHONE');
  const [fullName, setFullName] = useState('');
  const [ngoName, setNgoName] = useState('');

  const handleVerify = async () => {
    if (otp.length === 6) {
      setLoading(true);
      try {
        const result = await verifyOtp(confirmation, otp, role);
        if (result.success) {
          // Check if profile exists
          const profile = useAuthStore.getState().user;
          if (profile && profile.name && profile.name !== 'New User') {
            // Profile exists, logic in verifyOtp will have already logged them in
          } else {
            // New user, show profile completion
            setStep('PROFILE');
          }
        } else {
          showError(t('auth.loginError'), result.message);
        }
      } catch (err: any) {
        showError(t('common.error'), t('auth.otp.verifyError'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCompleteRegistration = async () => {
    if (!fullName.trim()) {
      showError('Required', 'Please enter your full name');
      return;
    }
    if (role === 'SUPERVISOR' && !ngoName.trim()) {
      showError('Required', 'Please enter your NGO name');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Session lost');

      const profileData: any = {
        name: fullName.trim(),
        fullName: fullName.trim(),
        phoneNumber: `+91${phoneNumber}`,
        role: role,
        authMethod: 'phone',
        createdAt: new Date().toISOString(),
      };

      if (role === 'SUPERVISOR') {
        profileData.ngoName = ngoName.trim();
        profileData.isVerified = false;
      }

      await firebaseAuthService.createUserProfile(user.uid, profileData);
      
      const appUser: AppUser = {
        id: user.uid,
        name: fullName.trim(),
        email: user.email || '',
        phone: profileData.phoneNumber,
        role: role as any,
        ngo_name: profileData.ngoName
      };

      const { setAuthSession } = useAuthStore.getState();
      setAuthSession(appUser, role as any);
    } catch (err: any) {
      showError('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  return (
    <GradientBackground style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={{
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
          measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
        }}
        attemptInvisibleVerification={false}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {step === 'PROFILE' ? 'Complete Profile' : t('auth.otp.title')}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'PROFILE' 
                ? 'Welcome! Just a few more details to get started.'
                : t('auth.otp.subtitle')}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={[globalStyles.card, styles.formCard]}>
              {step === 'PHONE' && (
                <>
                  <Text style={styles.label}>{t('auth.otp.phoneLabel')}</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.prefix}>+91</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.otp.phonePlaceholder')}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                  </View>
                  <PrimaryButton 
                    title={loading ? t('auth.otp.sending') : t('auth.otp.sendButton')} 
                    onPress={handleSendOtp} 
                    disabled={phoneNumber.length !== 10 || loading}
                    style={styles.button}
                  />
                </>
              )}

              {step === 'OTP' && (
                <Animated.View style={{ opacity: otpAnimation }}>
                  <Text style={styles.label}>{t('auth.otp.otpLabel')}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.otp.otpPlaceholder')}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>
                  
                  <View style={styles.timerRow}>
                    {timer > 0 ? (
                      <Text style={styles.timerText}>{t('auth.otp.resendText')} {timer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={() => {
                        setTimer(30);
                        handleSendOtp();
                      }}>
                        <Text style={styles.resendLink}>{t('auth.otp.resendButton')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <PrimaryButton 
                    title={loading ? t('auth.otp.verifying') : t('auth.otp.verifyButton')} 
                    onPress={handleVerify} 
                    disabled={otp.length !== 6 || loading}
                    style={styles.button}
                  />
                </Animated.View>
              )}

              {step === 'PROFILE' && (
                <View>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your name"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>

                  {role === 'SUPERVISOR' && (
                    <>
                      <Text style={styles.label}>NGO Name</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter NGO name"
                          value={ngoName}
                          onChangeText={setNgoName}
                        />
                      </View>
                    </>
                  )}

                  <PrimaryButton 
                    title={loading ? 'Creating Profile...' : 'Get Started'} 
                    onPress={handleCompleteRegistration} 
                    disabled={loading}
                    style={styles.button}
                  />
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <MadeInIndiaBadge />
            </View>
          </View>
        </SafeAreaView>
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
  },
  header: {
    padding: spacing.xl,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.md : spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyText,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  formCard: {
    padding: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    ...typography.captionText,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '30',
    paddingBottom: spacing.xs,
    marginBottom: spacing.lg,
  },
  prefix: {
    ...typography.bodyText,
    fontWeight: '700',
    marginRight: spacing.sm,
    color: colors.textPrimary,
  },
  textInput: {
    flex: 1,
    ...typography.bodyText,
    fontSize: 18,
    color: colors.textPrimary,
  },
  changeLink: {
    ...typography.captionText,
    color: colors.accentBlue,
    fontWeight: '600',
  },
  button: {
    marginTop: spacing.md,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  timerText: {
    ...typography.captionText,
    color: colors.textSecondary,
  },
  resendLink: {
    ...typography.captionText,
    color: colors.accentBlue,
    fontWeight: '700',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
});
