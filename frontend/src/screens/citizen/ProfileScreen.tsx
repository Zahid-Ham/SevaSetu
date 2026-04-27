import React from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppHeader, UserAvatar, PrimaryButton, DynamicText } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';

export const ProfileScreen = () => {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const userName = user?.name || "Citizen";

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
      <AppHeader title={t('citizen.profile.title')} rightIcon="settings" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          <View style={styles.avatarWrapper}>
            <UserAvatar name={userName} size={90} />
            <TouchableOpacity style={styles.editBadge}>
              <Feather name="edit-2" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <DynamicText text={userName} style={[typography.headingMedium, styles.name]} />
          <Text style={styles.roleText}>{t('citizen.impactPassport.verifiedCitizen')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('citizen.profile.accountSettings')}</Text>
          <View style={[globalStyles.card, styles.card]}>
            {renderOption('user', t('citizen.profile.personalDetails'), t('citizen.profile.personalDetailsSub'))}
            <View style={styles.separator} />
            {renderOption('lock', t('citizen.profile.privacySecurity'), t('citizen.profile.privacySecuritySub'))}
            <View style={styles.separator} />
            {renderOption('bell', t('citizen.profile.notifications'), t('citizen.profile.notificationsSub'))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('citizen.profile.community')}</Text>
          <View style={[globalStyles.card, styles.card]}>
            {renderOption('life-buoy', t('citizen.profile.supportCenter'), t('citizen.profile.supportCenterSub'))}
            <View style={styles.separator} />
            {renderOption('shield', t('citizen.profile.guidelines'), t('citizen.profile.guidelinesSub'))}
            <View style={styles.separator} />
            {renderOption('maximize', t('volunteer.recognition.verifyCertificate'), t('volunteer.recognition.verifySubtitle'), () => navigation.navigate('VerifyCertificate'))}
          </View>
        </View>

        {/* Volunteer CTA */}
        <View style={styles.section}>
          <LinearGradient
            colors={[colors.primaryGreen, '#1B5E20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.volunteerCard}
          >
            <View style={styles.volunteerIconBg}>
              <Ionicons name="heart" size={24} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.volunteerTitle}>{t('citizen.profile.becomeVolunteer')}</Text>
              <Text style={styles.volunteerSub}>{t('citizen.profile.becomeVolunteerSub')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.applyBtn}
              onPress={() => navigation.navigate('VolunteerApplication')}
            >
              <Text style={styles.applyBtnText}>{t('citizen.profile.applyNow')}</Text>
              <Feather name="arrow-right" size={16} color={colors.primaryGreen} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
        
        {/* Language Settings */}
        <View style={[styles.section]}>
          <Text style={styles.sectionLabel}>{t('citizen.profile.languageSettings')}</Text>
          <View style={[globalStyles.card, styles.card, { padding: spacing.md }]}>
            <Text style={[typography.captionText, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              {t('citizen.profile.switchLanguage')}
            </Text>
            <LanguageToggle />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t('auth.signOut')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('common.version')}</Text>
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
  volunteerCard: {
    padding: spacing.lg,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  volunteerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volunteerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  volunteerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: 4,
  },
  applyBtnText: {
    color: colors.primaryGreen,
    fontSize: 12,
    fontWeight: '700',
  },
});
