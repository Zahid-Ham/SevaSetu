import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, SectionTitle, MissionCard } from '../../components';
import { colors, spacing } from '../../theme';
import { MOCK_ISSUES } from '../../services/mock';

export const MyRequestsScreen = () => {
  const activeRequests = MOCK_ISSUES.slice(0, 2);
  const completedRequests = MOCK_ISSUES.filter(issue => issue.priority === 'resolved');

  return (
    <View style={styles.container}>
      <AppHeader title="My Requests" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle title="Active Requests" />
        <View style={styles.listContainer}>
          {activeRequests.map(req => (
            <MissionCard 
              key={req.id}
              title={req.title}
              description={req.description}
              location={`${req.latitude.toFixed(2)}, ${req.longitude.toFixed(2)}`}
              urgency={req.priority === 'urgent' ? 'High' : req.priority === 'medium' ? 'Medium' : 'Low'}
              onPress={() => {}}
            />
          ))}
        </View>

        <SectionTitle title="Completed" />
        <View style={styles.listContainer}>
          {completedRequests.map(req => (
            <MissionCard 
              key={req.id}
              title={req.title}
              description={req.description}
              location="Resolved"
              urgency="Low"
              onPress={() => {}}
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
