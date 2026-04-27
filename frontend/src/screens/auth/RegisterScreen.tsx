import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView 
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { PrimaryButton, MadeInIndiaBadge, GradientBackground, IconButton, AshokaChakra, ConfettiOverlay, StatusModal } from '../../components';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useNgoStore } from '../../services/store/useNgoStore';
import { useLanguage } from '../../context/LanguageContext';

export const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ngoName, setNgoName] = useState('');
  const [role, setRole] = useState(route.params?.role || 'CITIZEN');
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const register = useAuthStore(state => state.register);
  const { t, language } = useLanguage();
  const { ngos, loadNgos } = useNgoStore();
  const [showNgoDropdown, setShowNgoDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'error' as const, title: '', message: '' });

  React.useEffect(() => {
    if (role === 'SUPERVISOR') {
      loadNgos();
    }
  }, [role]);

  const filteredNgos = ngos.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showError = (title: string, message: string) => {
    console.log('[Register] Showing error:', title, message);
    setModalConfig({ type: 'error', title, message });
    setModalVisible(true);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      showError(t('auth.register.missingInfo'), t('auth.register.enterFullName'));
      return;
    }
    if (password !== confirmPassword) {
      showError(t('auth.register.failed'), t('auth.register.passwordMismatch'));
      return;
    }
    if (role === 'SUPERVISOR' && !ngoName) {
      showError(t('auth.register.missingInfo'), t('auth.register.ngoNamePlaceholder'));
      return;
    }

    console.log('[Register] Attempting registration for:', email);
    setLoading(true);
    try {
      const result = await register(email, password, fullName, phone, role, role === 'SUPERVISOR' ? ngoName : undefined);
      console.log('[Register] Result:', result.success);
      if (result.success) {
        setShowConfetti(true);
      } else {
        showError(t('auth.register.failed'), result.message);
      }
    } catch (err: any) {
      console.error('[Register] Unexpected error:', err);
      showError(t('common.error'), t('auth.register.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    console.log('[Register] Closing modal');
    setModalVisible(false);
  };

  return (
    <GradientBackground style={styles.container}>
      <ConfettiOverlay play={showConfetti} onAnimationFinish={() => setShowConfetti(false)} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
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
                <AshokaChakra size={50} color="#FFFFFF" opacity={0.15} style={styles.headerChakra} />
                <Text style={styles.title}>{t('auth.register.title')}</Text>
                <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
              </Animated.View>
            </SafeAreaView>
          </View>

          <View style={styles.content}>
            <Animated.View 
              entering={FadeInDown.delay(400).springify()}
              style={styles.formCard}
            >
              <View style={styles.roleSelector}>
                <Text style={styles.inputLabel}>{t('auth.register.iAmA') || 'I am a...'}</Text>
                <View style={styles.roleOptions}>
                  {['CITIZEN', 'SUPERVISOR'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleChip,
                        role === r && styles.roleChipActive
                      ]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[
                        styles.roleChipText,
                        role === r && styles.roleChipTextActive
                      ]}>
                        {r === 'SUPERVISOR' ? t('auth.ngoSupervisor') : t(`auth.${r.toLowerCase()}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.register.fullName')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="E.g. Rajesh Kumar"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.register.email')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    keyboardType="email-address"
                    placeholder="E.g. rajesh@email.com"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.register.phone')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    keyboardType="phone-pad"
                    placeholder="10-digit number"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={10}
                  />
                </View>
              </View>

              {role === 'SUPERVISOR' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('auth.register.ngoName')}</Text>
                  <TouchableOpacity 
                    style={styles.inputContainer}
                    onPress={() => setShowNgoDropdown(!showNgoDropdown)}
                  >
                    <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <Text style={[styles.textInput, !ngoName && { color: colors.textSecondary + '60' }]}>
                      {ngoName || t('auth.register.ngoNamePlaceholder')}
                    </Text>
                    <Ionicons name={showNgoDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {showNgoDropdown && (
                    <View style={styles.dropdown}>
                      <TextInput
                        style={styles.dropdownSearch}
                        placeholder={t('common.search') + ' NGO...'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                        {filteredNgos.map((ngo) => (
                          <TouchableOpacity
                            key={ngo.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setNgoName(ngo.name);
                              setShowNgoDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{ngo.name}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={[styles.dropdownItem, styles.newItem]}
                          onPress={() => {
                            if (searchQuery) {
                              setNgoName(searchQuery);
                              setShowNgoDropdown(false);
                            }
                          }}
                        >
                          <Ionicons name="add-circle-outline" size={18} color={colors.primarySaffron} />
                          <Text style={styles.newItemText}>
                            {searchQuery ? `Use "${searchQuery}"` : "Type to add new NGO"}
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.register.password')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    secureTextEntry
                    placeholder="Min 6 characters"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.register.confirmPassword')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    secureTextEntry
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>

              <PrimaryButton 
                title={loading ? t('auth.register.loading') : t('auth.register.button')} 
                onPress={handleRegister} 
                style={styles.registerBtn}
                disabled={loading}
              />
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(600).springify()}
              style={styles.loginContainer}
            >
              <Text style={styles.loginText}>{t('auth.alreadyAccount')} </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
                 <Text style={styles.loginLink}>{t('auth.loginButton')}</Text>
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
    paddingBottom: 40,
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
    top: -10,
  },
  title: {
    ...typography.displayTitle,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyText,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
    maxWidth: '85%',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    marginTop: -30,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navyBlue,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.navyBlue,
  },
  registerBtn: {
    height: 54,
    borderRadius: 16,
    marginTop: 10,
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleChipActive: {
    backgroundColor: colors.primarySaffron + '15',
    borderColor: colors.primarySaffron,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.primarySaffron,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primarySaffron,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  dropdownSearch: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    fontSize: 14,
    fontWeight: '600',
    color: colors.navyBlue,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  newItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySaffron + '05',
    gap: 8,
  },
  newItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primarySaffron,
  },
});

export default RegisterScreen;
