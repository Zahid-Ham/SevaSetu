import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppHeader, CrisisMap, Issue } from '../../components';
import { colors, typography, globalStyles, spacing } from '../../theme';
import { useEventStore } from '../../services/store/useEventStore';

export const CrisisHeatmapScreen = () => {
  const { reports, loadReports } = useEventStore();
  const [filter, setFilter] = useState<'all' | 'urgent' | 'medium' | 'resolved'>('all');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const getPriorityColor = (priority: Issue['priority']) => {
    switch (priority) {
      case 'urgent': return colors.error;
      case 'medium': return colors.warning;
      case 'resolved': return colors.success;
      default: return colors.error;
    }
  };

  // Map Backend Reports to Issue Interface
  const liveIssues: Issue[] = reports.map((r) => {
    const coords = r.gps_coordinates || r.precise_location || "";
    const [lat, lng] = coords.split(',').map((s: string) => parseFloat(s.trim()));
    
    // Map Urgency to Priority
    let priority: Issue['priority'] = 'medium';
    const urgency = r.urgency_level?.toLowerCase() || "";
    if (urgency === 'critical' || urgency === 'high') priority = 'urgent';
    else if (urgency === 'moderate') priority = 'medium';
    else if (urgency === 'low' || urgency === 'resolved') priority = 'resolved';

    const category = r.primary_category || r.secondary_category || "Issue";
    const summary = r.executive_summary || r.description || "Field Report";
    const niceTitle = `${category}: ${summary}`;

    return {
      id: r.id,
      title: niceTitle, // Let the UI handle truncation with numberOfLines={1}
      description: r.description || r.executive_summary || "No description provided.",
      priority,
      latitude: lat || 28.6139,
      longitude: lng || 77.2090,
    };
  });

  const filteredIssues = filter === 'all' 
    ? liveIssues 
    : liveIssues.filter(i => i.priority === filter);

  const FilterOption = ({ type, label, color }: { type: typeof filter, label: string, color: string }) => (
    <TouchableOpacity 
      style={[styles.filterOption, filter === type && styles.filterOptionSelected]}
      onPress={() => {
        setFilter(type);
        setIsFilterVisible(false);
      }}
    >
      <View style={[styles.legendColor, { backgroundColor: color }]} />
      <Text style={[styles.filterText, filter === type && styles.filterTextSelected]}>{label}</Text>
      {filter === type && <Feather name="check" size={16} color={colors.primarySaffron} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Crisis Heatmap" />
      <View style={styles.mapContainer}>
        
        <CrisisMap 
          issues={filteredIssues} 
          focusedIssueId={focusedIssueId}
        />

        {/* Interactive Legend Trigger */}
        <TouchableOpacity 
          style={[globalStyles.card, styles.floatingCard]}
          onPress={() => setIsFilterVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.legendHeader}>
            <Text style={styles.legendTitle}>Legend</Text>
            <Feather name="filter" size={14} color={colors.textSecondary} />
          </View>
          
          <View style={styles.legendPreview}>
            <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
            <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
            <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
          </View>
          
          <Text style={styles.activeFilterText}>
            Showing: {filter === 'all' ? 'All Issues' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>

        {/* Filter Modal */}
        <Modal
          visible={isFilterVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsFilterVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Issues Explorer</Text>
                <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                  <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Category Selector */}
              <View style={styles.categoryRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(['all', 'urgent', 'medium', 'resolved'] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catTab,
                        filter === cat && styles.catTabActive,
                        { borderColor: cat === 'all' ? colors.textSecondary : cat === 'urgent' ? colors.error : cat === 'medium' ? colors.warning : colors.success }
                      ]}
                      onPress={() => setFilter(cat)}
                    >
                      <Text style={[styles.catTabText, filter === cat && styles.catTabTextActive]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Issue List */}
              <ScrollView style={styles.issueList} showsVerticalScrollIndicator={false}>
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => (
                    <TouchableOpacity 
                      key={issue.id} 
                      style={styles.issueListItem}
                      onPress={() => {
                        setFocusedIssueId(issue.id);
                        setIsFilterVisible(false);
                      }}
                    >
                      <View style={styles.issueListHeader}>
                        <Text style={styles.issueListTitle} numberOfLines={1}>{issue.title}</Text>
                        <View style={[styles.miniBadge, { backgroundColor: getPriorityColor(issue.priority) }]}>
                          <Text style={styles.miniBadgeText}>{issue.priority.toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={styles.issueListFooter}>
                        <Feather name="map-pin" size={12} color={colors.textSecondary} />
                        <Text style={styles.issueListCoords} numberOfLines={1}>
                          GPS: {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Feather name="info" size={40} color={colors.textSecondary + '40'} />
                    <Text style={styles.emptyStateText}>No issues found in this category.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    padding: spacing.sm,
    minWidth: 120,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendTitle: {
    ...typography.headingSmall,
    fontSize: 14,
  },
  legendPreview: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  activeFilterText: {
    ...typography.captionText,
    fontSize: 10,
    color: colors.primarySaffron,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    elevation: 5,
  },
  modalTitle: {
    ...typography.headingMedium,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  filterOptionSelected: {
    backgroundColor: colors.primarySaffron + '10',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  filterText: {
    ...typography.bodyText,
    flex: 1,
  },
  filterTextSelected: {
    color: colors.primarySaffron,
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryRow: {
    marginBottom: spacing.md,
  },
  catTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.sm,
    backgroundColor: colors.cardBackground,
  },
  catTabActive: {
    backgroundColor: colors.primarySaffron + '10',
    borderColor: colors.primarySaffron,
  },
  catTabText: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  catTabTextActive: {
    color: colors.primarySaffron,
  },
  issueList: {
    maxHeight: 400,
  },
  issueListItem: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primarySaffron,
  },
  issueListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  issueListTitle: {
    ...typography.headingSmall,
    flex: 1,
    marginRight: spacing.sm,
  },
  miniBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  issueListDesc: {
    ...typography.bodyText,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  issueListFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  issueListCoords: {
    ...typography.captionText,
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
