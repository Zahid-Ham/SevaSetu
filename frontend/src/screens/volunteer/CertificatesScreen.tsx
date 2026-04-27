import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { AppHeader } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { certificateService, RecognitionResponse, Badge, Certificate } from '../../services/certificateService';

const TIER_COLORS: Record<string, [string, string]> = {
  bronze: ['#CD7F32', '#A0522D'],
  silver: ['#A8A9AD', '#708090'],
  gold: ['#FFD700', '#B8860B'],
};

const TIER_BG: Record<string, [string, string]> = {
  bronze: ['#FDF3E7', '#F5DEB3'],
  silver: ['#F5F5F5', '#E8E8E8'],
  gold: ['#FFFBEC', '#FFF3B0'],
};

const ALL_TIERS = [
  { tier: 'bronze', req: 5 },
  { tier: 'silver', req: 15 },
  { tier: 'gold', req: 30 }
];


export const CertificatesScreen = () => {
  const { t, language } = useLanguage();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [data, setData] = useState<RecognitionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const res = await certificateService.getRecognition(user.id);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRegenerate = async (certId: string) => {
    try {
      setIsRegenerating(certId);
      await certificateService.regenerateCertificate(certId);
      await fetchData();
      Alert.alert(
        t('common.success') || "Success", 
        language === 'hi' ? 'प्रमाण पत्र को सफलतापूर्वक पुन: उत्पन्न किया गया है' : 'Certificate has been successfully regenerated'
      );
    } catch (err) {
      console.error("Regeneration error:", err);
      Alert.alert(t('common.error') || "Error", "Failed to regenerate certificate.");
    } finally {
      setIsRegenerating(null);
    }
  };

  const renderBadge = ({ item }: { item: Badge }) => (
    <View style={[styles.badgeItem, !item.is_earned && styles.badgeLocked]}>
      <View style={styles.badgeIconContainer}>
        <Text style={styles.badgeEmoji}>{item.icon}</Text>
        {!item.is_earned && (
          <View style={styles.lockOverlay}>
            <Feather name="lock" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text style={styles.badgeLabel}>{item.label[language]}</Text>
    </View>
  );

  const renderCertificate = (cert: Certificate) => {
    const rawUrl = language === 'hi' ? (cert.pdf_url_hi || cert.pdf_url) : (cert.pdf_url_en || cert.pdf_url);
    const activeUrl = `${rawUrl}&t=${new Date().getTime()}`;
    const activeName = language === 'hi' ? (cert.volunteer_name_hi || cert.volunteer_name) : cert.volunteer_name;
    const filename = `SevaSetu_${cert.tier}_${cert.id}`;

    return (
      <View key={cert.id} style={styles.certCard}>
        <LinearGradient
          colors={TIER_BG[cert.tier] ?? ['#FDF3E7', '#F5DEB3']}
          style={styles.certGradient}
        >
          <View style={styles.certHeader}>
            <LinearGradient
              colors={TIER_COLORS[cert.tier] ?? ['#CD7F32', '#A0522D']}
              style={styles.tierBadge}
            >
              <Text style={styles.tierText}>{cert.tier_label[language].toUpperCase()}</Text>
            </LinearGradient>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.refreshBtn}
                onPress={() => handleRegenerate(cert.id)}
                disabled={isRegenerating === cert.id}
              >
                {isRegenerating === cert.id ? (
                  <ActivityIndicator size="small" color={colors.primarySaffron} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={colors.primarySaffron} />
                )}
              </TouchableOpacity>
              <Text style={styles.certNo}>{cert.id}</Text>
            </View>
          </View>

          <Text style={styles.certTitle}>{t('volunteer.recognition.certificates')}</Text>
          <Text style={styles.certName}>{activeName}</Text>
          <Text style={styles.certDesc} numberOfLines={2}>{cert.description[language]}</Text>

          <View style={styles.certFooter}>
            <Text style={styles.certDate}>{t('volunteer.recognition.issueDate')}: {cert.issue_date}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => certificateService.viewCertificate(activeUrl)}
              >
                <Feather name="eye" size={16} color={colors.primaryGreen} />
                <Text style={styles.actionText}>{t('common.view')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.downloadBtnBorder]}
                onPress={() => certificateService.downloadCertificate(activeUrl, filename)}
              >
                <Feather name="download" size={16} color="#fff" />
                <Text style={styles.actionTextWhite}>{t('common.download')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('volunteer.recognition.title')}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Next Tier Progress */}
        {data?.next_tier && (
          <View style={[globalStyles.card, styles.progressCard]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{t('volunteer.recognition.nextTier')}</Text>
              <Text style={styles.progressLabel}>{data.next_tier.label[language]}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, {
                  width: `${Math.min((data.next_tier.current / data.next_tier.threshold) * 100, 100)}%` as any
                }]}
              />
            </View>
            <Text style={styles.progressStats}>
              {data.next_tier.current} / {data.next_tier.threshold} {t('volunteer.recognition.totalReports')}
            </Text>
          </View>
        )}

        {/* Badges Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('volunteer.recognition.badges')}</Text>
        </View>
        <FlatList
          data={data?.badges}
          renderItem={renderBadge}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeList}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('common.loading')}</Text>}
        />

        {/* Certificates Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('volunteer.recognition.certificates')}</Text>
        </View>
        <View style={styles.certList}>
          {ALL_TIERS.map(tierDef => {
            const earnedCert = data?.certificates?.find(c => c.tier === tierDef.tier);
            if (earnedCert) {
              return renderCertificate(earnedCert);
            }
            // Locked placeholder
            return (
              <View key={tierDef.tier} style={[styles.certCard, { opacity: 0.6 }]}>
                <LinearGradient colors={['#F5F5F5', '#E8E8E8']} style={styles.certGradient}>
                  <View style={styles.certHeader}>
                    <LinearGradient colors={TIER_COLORS[tierDef.tier] ?? ['#A8A9AD', '#708090']} style={[styles.tierBadge, { opacity: 0.5 }]}>
                      <Text style={styles.tierText}>{tierDef.tier.toUpperCase()}</Text>
                    </LinearGradient>
                    <Feather name="lock" size={16} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.certTitle}>{t('volunteer.recognition.certificates')}</Text>
                  <Text style={[styles.certName, { color: colors.textSecondary }]}>
                    {t('volunteer.recognition.locked')}
                  </Text>
                  <Text style={styles.certDesc}>
                    {t(tierDef.tier === 'bronze' ? 'volunteer.recognition.unlockPromptBronze' : tierDef.tier === 'silver' ? 'volunteer.recognition.unlockPromptSilver' : 'volunteer.recognition.unlockPromptGold' as any)}
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: spacing.xl },
  progressCard: { margin: spacing.md, padding: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  progressTitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  progressLabel: { fontSize: 14, color: colors.primaryGreen, fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: spacing.xs },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressStats: { fontSize: 12, color: colors.textSecondary },
  sectionHeader: { paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  badgeList: { paddingHorizontal: spacing.md },
  badgeItem: { alignItems: 'center', marginRight: spacing.lg, width: 80 },
  badgeLocked: { opacity: 0.4 },
  badgeIconContainer: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  badgeEmoji: { fontSize: 30 },
  lockOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.textSecondary, width: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff'
  },
  badgeLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: colors.textPrimary },
  certList: { paddingHorizontal: spacing.md },
  certCard: {
    marginBottom: spacing.md, borderRadius: 16, overflow: 'hidden',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8
  },
  certGradient: { padding: spacing.lg },
  certHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    marginRight: spacing.xs,
  },
  tierBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  tierText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  certNo: { fontSize: 10, color: colors.textSecondary, fontFamily: 'monospace' },
  certTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  certName: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginVertical: spacing.xs },
  certDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  certFooter: {
    flexDirection: 'column', gap: spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: spacing.md
  },
  certDate: { fontSize: 12, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: 8, backgroundColor: 'rgba(76, 175, 80, 0.1)'
  },
  downloadBtnBorder: {
    backgroundColor: colors.primaryGreen,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  actionTextWhite: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', padding: spacing.xl, opacity: 0.5 },
  emptyText: { marginTop: spacing.md, fontSize: 14, color: colors.textSecondary },
});
