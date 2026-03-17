import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, SectionTitle, ImpactCard, IconButton } from '../../components';
import { colors, spacing } from '../../theme';

export const ImpactReportsScreen = () => {
  return (
    <View style={styles.container}>
      <AppHeader title="Impact Reports" rightIcon="download" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <SectionTitle title="Weekly Highlights" />
        <View style={styles.listContainer}>
          <ImpactCard 
            title="Food Distribution Drive"
            metric="500+ Meals Served"
            date="Feb 24 - Mar 02"
          />
          <ImpactCard 
            title="Medical Camp"
            metric="120 Beneficiaries"
            date="Mar 05"
          />
        </View>

        <SectionTitle title="System Reports" />
        <View style={styles.listContainer}>
          <ImpactCard 
            title="Volunteer Engagement"
            metric="+15% vs Last Month"
            date="Automated Report"
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
