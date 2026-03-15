import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, SectionTitle, ImpactCard } from '../../components';
import { colors, spacing } from '../../theme';

export const LearningScreen = () => {
  return (
    <View style={styles.container}>
      <AppHeader title="Training & Resources" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle title="Required Modules" />
        <View style={styles.listContainer}>
          <ImpactCard 
            title="Code of Conduct"
            metric="Module 1"
            date="Estimated: 15 mins"
          />
          <ImpactCard 
            title="Privacy Guidelines"
            metric="Module 2"
            date="Estimated: 20 mins"
          />
        </View>

        <SectionTitle title="Recommended Resources" />
        <View style={styles.listContainer}>
          <ImpactCard 
            title="Handling Emergency Situations"
            metric="Video Guide"
            date="10 mins read"
          />
          <ImpactCard 
            title="Using the SevaSetu App"
            metric="Interactive Tutorial"
            date="5 mins read"
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
