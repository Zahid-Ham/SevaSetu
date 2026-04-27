import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, SectionTitle, ImpactCard, IconButton } from '../../components';
import { colors, spacing } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

export const ImpactReportsScreen = () => {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <AppHeader title={t('supervisor.impactReports.title')} rightIcon="download" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <SectionTitle title={t('supervisor.impactReports.weeklyHighlights')} />
        <View style={styles.listContainer}>
          <ImpactCard 
            title={t('supervisor.impactReports.foodDrive')}
            metric={t('supervisor.impactReports.mealsServed')}
            date="Feb 24 - Mar 02"
          />
          <ImpactCard 
            title={t('supervisor.impactReports.medicalCamp')}
            metric={t('supervisor.impactReports.beneficiaries')}
            date="Mar 05"
          />
        </View>

        <SectionTitle title={t('supervisor.impactReports.systemReports')} />
        <View style={styles.listContainer}>
          <ImpactCard 
            title={t('supervisor.impactReports.volEngagement')}
            metric={t('supervisor.impactReports.engagementMetric')}
            date={t('supervisor.impactReports.autoReport')}
          />
        </View>

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
  listContainer: {
    paddingHorizontal: spacing.md,
  },
});
