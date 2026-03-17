import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AppHeader, CrisisMap, Issue } from '../../components';
import { colors, typography, globalStyles, spacing } from '../../theme';
import { MOCK_ISSUES } from '../../services/mock';

export const CrisisHeatmapScreen = () => {
  const demoIssues = MOCK_ISSUES;

  return (
    <View style={styles.container}>
      <AppHeader title="Crisis Heatmap" />
      <View style={styles.mapContainer}>
        
        <CrisisMap issues={demoIssues} />

        {/* Floating Legends */}
        <View style={[globalStyles.card, styles.floatingCard]}>
          <Text style={[typography.headingSmall, { marginBottom: spacing.xs }]}>Legend</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
            <Text style={typography.captionText}>Urgent Crisis</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
            <Text style={typography.captionText}>Medium Priority</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
            <Text style={typography.captionText}>Resolved</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  floatingCard: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    opacity: 0.95,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
});
