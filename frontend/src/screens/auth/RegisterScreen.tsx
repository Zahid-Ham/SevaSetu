import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Platform, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { PrimaryButton, MadeInIndiaBadge, GradientBackground } from '../../components';

export const RegisterScreen = ({ onSelectRole }: { onSelectRole?: (role: any) => void }) => {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'CITIZEN' | 'SUPERVISOR'>('CITIZEN');
  const [agreed, setAgreed] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  const handleRegister = () => {
    // In a real app we would fire an API registration step here.
    // We instantly log them in to the selected role to demonstrate the navigation.
    if (onSelectRole) {
      onSelectRole(selectedRole);
    }
  };

  const getRoleDisplayName = (r: string) => {
    if (r === 'SUPERVISOR') return 'NGO Supervisor';
    return r.charAt(0) + r.slice(1).toLowerCase();
  };

  const isFormValid = fullName && email && phone.length === 10 && password && password === confirmPassword && agreed;

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.headerGradient}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join SevaSetu to start making an impact in your community today.
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[globalStyles.card, styles.formCard]}>
            
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor={colors.textSecondary + '80'}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                keyboardType="email-address"
                placeholder="Email Address"
                placeholderTextColor={colors.textSecondary + '80'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <Text style={styles.prefixText}>+91</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="phone-pad"
                placeholder="Phone Number"
                placeholderTextColor={colors.textSecondary + '80'}
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>

            {/* Custom Role Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.dropdownHeader} 
                onPress={() => setShowRoleSelector(!showRoleSelector)}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons name="briefcase-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.textInput, { color: colors.textPrimary }]}>
                    {getRoleDisplayName(selectedRole)}
                  </Text>
                </View>
                <Ionicons name={showRoleSelector ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              {showRoleSelector && (
                <View style={styles.dropdownOptionsList}>
                  {(['CITIZEN', 'SUPERVISOR'] as const).map(r => (
                    <TouchableOpacity 
                      key={r}
                      style={[styles.dropdownOption, selectedRole === r && styles.dropdownOptionSelected]}
                      onPress={() => {
                        setSelectedRole(r);
                        setShowRoleSelector(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, selectedRole === r && styles.dropdownOptionTextSelected]}>
                        {getRoleDisplayName(r)}
                      </Text>
                      {selectedRole === r && (
                        <Ionicons name="checkmark" size={18} color={colors.primaryGreen} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={colors.textSecondary + '80'}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry
                placeholder="Confirm Password"
                placeholderTextColor={colors.textSecondary + '80'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Checkbox Section */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.checkboxRow} 
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={16} color={colors.cardBackground} />}
              </View>
              <Text style={styles.checkboxText}>
                I agree to the <Text style={styles.linkText}>Community Guidelines</Text> & <Text style={styles.linkText}>Terms</Text>
              </Text>
            </TouchableOpacity>

            <PrimaryButton 
              title="Register Account" 
              onPress={handleRegister} 
              style={[
                styles.registerBtn, 
                // Since gradient is Saffron, match standard PrimaryButton saffron or keep default
                { backgroundColor: isFormValid ? colors.primarySaffron : colors.textSecondary }
              ]}
              disabled={!isFormValid}
            />
          </View>

          <MadeInIndiaBadge />
        </ScrollView>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 1.5,
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
    fontSize: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyText,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    marginTop: -spacing.xl * 1.5,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  formCard: {
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    height: 52,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  prefixText: {
    ...typography.bodyText,
    fontWeight: '600',
    borderRightWidth: 1,
    borderRightColor: colors.textSecondary + '30',
    paddingRight: spacing.sm,
    marginRight: spacing.sm,
    color: colors.textPrimary,
  },
  textInput: {
    flex: 1,
    ...typography.bodyText,
    height: '100%',
  },
  // Custom Dropdown
  dropdownContainer: {
    marginBottom: spacing.md,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    height: 52,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownOptionsList: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '10',
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primaryGreen + '10',
  },
  dropdownOptionText: {
    ...typography.bodyText,
    color: colors.textPrimary,
  },
  dropdownOptionTextSelected: {
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSecondary + '50',
    marginRight: spacing.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  checkboxText: {
    ...typography.captionText,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: colors.accentBlue,
    fontWeight: '600',
  },
  registerBtn: {
    width: '100%',
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
