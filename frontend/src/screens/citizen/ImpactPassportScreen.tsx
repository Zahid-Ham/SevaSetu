import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppHeader, SectionTitle, PrimaryButton, DynamicText } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../services/store/useAuthStore';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiConfig';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export const ImpactPassportScreen = () => {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const qrRef = React.useRef<any>();

  const userName = user?.name || "Ramesh Kumar";
  const userUniqueId = user?.id ? `SEVA-PASS-${user.id}` : "SEVA-GUEST";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/reports`, {
          params: { citizen_id: user?.id }
        });
        if (response.data.success) {
          // Filter only completed/resolved reports as 'Aid Received'
          const resolved = response.data.reports.filter((r: any) => 
            r.status === 'Resolved' || r.status === 'Completed'
          );
          setHistory(resolved);
        }
      } catch (error) {
        console.error('Error fetching aid history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user?.id]);

  const handleShare = async () => {
    try {
      // Fallback to Web API for sharing to avoid native SVG module issues in Expo Go
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(userUniqueId)}`;
      const filename = `${FileSystem.cacheDirectory}seva_passport_${user?.id}.png`;
      
      const downloadRes = await FileSystem.downloadAsync(qrUrl, filename);
      
      if (downloadRes.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'image/png',
            dialogTitle: t('citizen.impactPassport.shareTitle'),
            UTI: 'public.png',
          });
        } else {
          Alert.alert(t('common.error'), "Sharing is not available on this device");
        }
      } else {
        throw new Error("Failed to generate QR image");
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(t('common.error'), "Failed to share QR code. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('citizen.impactPassport.title')} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Central Passport Card */}
        <View style={[globalStyles.card, styles.qrCard]}>
          <DynamicText text={userName} style={styles.citizenName} />
          <Text style={styles.uniqueId}>ID: {userUniqueId}</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              getRef={(c) => (qrRef.current = c)}
              value={userUniqueId}
              size={180}
              color={colors.textPrimary}
              backgroundColor={colors.cardBackground}
            />
          </View>
          <Text style={styles.scanText}>{t('citizen.impactPassport.scanToVerify')}</Text>
        </View>

        {/* Aid History Section */}
        <SectionTitle title={t('citizen.impactPassport.aidHistory')} />
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator color={colors.primarySaffron} style={{ marginVertical: 20 }} />
          ) : history.length > 0 ? (
            history.map((item, index) => (
              <View key={item.id || index} style={[globalStyles.card, styles.historyItem]}>
                <View style={styles.historyIconBox}>
                  <Ionicons 
                    name={item.primary_category === 'Food Assistance' ? 'restaurant' : (item.primary_category === 'Medical Help' ? 'medical' : 'checkmark-circle')} 
                    size={20} 
                    color={colors.accentBlue} 
                  />
                </View>
                <View style={styles.historyTextContainer}>
                  <Text style={typography.headingSmall}>{item.primary_category}</Text>
                  <Text style={styles.dateText}>{item.resolved_at || t('citizen.impactPassport.completed')}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>{t('citizen.impactPassport.noHistory')}</Text>
            </View>
          )}
        </View>

        {/* Skills Section */}
        <SectionTitle title={t('citizen.impactPassport.skillsAndTrades')} />
        <View style={styles.skillsContainer}>
          <View style={styles.skillBadge}>
            <Text style={styles.skillText}>{t('citizen.impactPassport.skills.construction')}</Text>
          </View>
          <View style={styles.skillBadge}>
             <Text style={styles.skillText}>{t('citizen.impactPassport.skills.plumbing')}</Text>
          </View>
          <View style={styles.skillBadge}>
             <Text style={styles.skillText}>{t('citizen.impactPassport.skills.tailoring')}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton 
            title={t('citizen.impactPassport.sharePassport')} 
            onPress={handleShare} 
            iconName="share-social-outline" 
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
  qrCard: {
    margin: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 4,
    borderTopColor: colors.primarySaffron,
  },
  citizenName: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  uniqueId: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    letterSpacing: 1,
    fontFamily: 'monospace', // Gives it a more ID-like quality if font isn't loaded
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanText: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentBlue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  historyTextContainer: {
    flex: 1,
  },
  dateText: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginTop: 2,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  skillBadge: {
    backgroundColor: colors.primaryGreen + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryGreen + '30',
  },
  skillText: {
    ...typography.bodyText,
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xxl,
  },
  emptyHistory: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.textSecondary + '10',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
