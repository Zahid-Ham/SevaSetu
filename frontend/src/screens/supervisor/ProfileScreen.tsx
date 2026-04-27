import React from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AppHeader, UserAvatar, PrimaryButton, DynamicText } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const SupervisorProfileScreen = () => {
  const { user, logout } = useAuthStore();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const userName = user?.name || "NGO Supervisor";

  return (
    <View style={styles.container}>
      <AppHeader title={t('supervisor.profile.title')} rightIcon="settings" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerArea}>
          <UserAvatar name={userName} size={80} />
          <DynamicText style={[typography.headingMedium, styles.name]} text={userName} />
          <DynamicText style={typography.captionText} text={`${user?.ngo_name || "Regional Supervisor"} • NGO Head`} />
        </View>

        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>{t('supervisor.profile.orgInfo')}</Text>
          <DynamicText style={[typography.bodyText, styles.detailItem]} text={user?.ngo_name || "Helping Hands Foundation"} />
          <Text style={[typography.bodyText, styles.detailItem]}>{t('supervisor.profile.assignedRole')} NGO Supervisor</Text>
        </View>

        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>{t('supervisor.profile.systemAccess')}</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>{t('supervisor.profile.adminPrivileges')} {t('supervisor.profile.granted')}</Text>
          <Text style={[typography.bodyText, styles.detailItem]}>{t('supervisor.profile.reportingLevel')} Tier 1</Text>
        </View>

        {/* Verify Certificate Link */}
        <TouchableOpacity 
          style={[globalStyles.card, styles.card, { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }]}
          onPress={() => navigation.navigate('VerifyCertificate')}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
            <Feather name="maximize" size={20} color="#1E88E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.headingSmall, marginBottom: 2 }}>{t('volunteer.recognition.verifyCertificate')}</Text>
            <Text style={{ ...typography.bodyText, color: colors.textSecondary, fontSize: 13 }}>{t('volunteer.recognition.verifySubtitle')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Language Settings */}
        <View style={[globalStyles.card, styles.card]}>
          <Text style={typography.headingSmall}>{t('supervisor.profile.languageSettings')}</Text>
          <Text style={[styles.detailItem, { fontSize: 12, marginBottom: spacing.sm }]}>
            {t('supervisor.profile.switchLanguage')}
          </Text>
          <LanguageToggle />
        </View>
        
        <PrimaryButton title={t('auth.logoutButton')} onPress={logout} style={styles.logoutBtn} />
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
