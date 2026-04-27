import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { AppHeader, SectionTitle, MissionCard } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../services/store/useAuthStore';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const MyRequestsScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports`, {
        params: { citizen_id: user?.id }
      });
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const activeRequests = reports.filter(r => r.status !== 'Resolved' && r.status !== 'Completed');
  const completedRequests = reports.filter(r => r.status === 'Resolved' || r.status === 'Completed');

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color={colors.textSecondary + '40'} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title={t('citizen.myRequests.title')} />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primarySaffron]} />
        }
      >
        <SectionTitle title={t('citizen.myRequests.activeRequests')} />
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator color={colors.primarySaffron} style={{ marginVertical: 20 }} />
          ) : activeRequests.length > 0 ? (
            activeRequests.map(req => (
              <MissionCard 
                key={req.id}
                title={req.primary_category || 'Request'}
                description={req.description || 'No description provided'}
                location={req.precise_location || 'Global'}
                urgency={req.urgency_level || 'Moderate'}
                onPress={() => navigation.navigate('CitizenReportDetail', { report: req })}
              />
            ))
          ) : renderEmptyState(t('citizen.myRequests.noActive'))}
        </View>

        <SectionTitle title={t('citizen.myRequests.completed')} />
        <View style={styles.listContainer}>
          {loading ? null : completedRequests.length > 0 ? (
            completedRequests.map(req => (
              <MissionCard 
                key={req.id}
                title={req.primary_category || 'Resolved'}
                description={req.description}
                location={t('citizen.myRequests.resolved')}
                urgency="Low"
                onPress={() => navigation.navigate('CitizenReportDetail', { report: req })}
              />
            ))
          ) : renderEmptyState(t('citizen.myRequests.noCompleted'))}
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.textSecondary + '10',
    borderStyle: 'dashed',
  },
  emptyText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
