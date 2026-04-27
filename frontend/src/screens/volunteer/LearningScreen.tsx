import React from 'react';
import { ScrollView, StyleSheet, View, Linking, Alert } from 'react-native';
import { AppHeader, SectionTitle, ImpactCard } from '../../components';
import { colors, spacing } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { MOCK_LEARNING_RESOURCES } from '../../services/mock';

export const LearningScreen = () => {
  const { t } = useLanguage();

  const handleOpenResource = (link: string) => {
    Linking.canOpenURL(link).then(supported => {
      if (supported) {
        Linking.openURL(link);
      } else {
        Alert.alert(t('common.error'), "Cannot open this resource link.");
      }
    });
  };

  const requiredModules = MOCK_LEARNING_RESOURCES.filter(r => r.isRequired);
  const recommendedResources = MOCK_LEARNING_RESOURCES.filter(r => !r.isRequired);

  return (
    <View style={styles.container}>
      <AppHeader title={t('volunteer.learning.title')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle title={t('volunteer.learning.requiredModules')} />
        <View style={styles.listContainer}>
          {requiredModules.map(resource => (
            <ImpactCard 
              key={resource.id}
              title={resource.title}
              metric={resource.category}
              date={resource.duration}
              onPress={() => handleOpenResource(resource.link)}
            />
          ))}
        </View>

        <SectionTitle title={t('volunteer.learning.recommendedResources')} />
        <View style={styles.listContainer}>
          {recommendedResources.map(resource => (
            <ImpactCard 
              key={resource.id}
              title={resource.title}
              metric={resource.category}
              date={resource.duration}
              onPress={() => handleOpenResource(resource.link)}
            />
          ))}
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
