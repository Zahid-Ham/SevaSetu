import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AppHeader, SectionTitle, DynamicText } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export const CitizenReportDetailScreen = () => {
  const { t } = useLanguage();
  const route = useRoute();
  const navigation = useNavigation();
  const { report } = route.params as { report: any };
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playSound = async () => {
    if (!report.audio_url) return;
    
    try {
      if (sound) {
        await sound.replayAsync();
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: report.audio_url },
          { shouldPlay: true }
        );
        setSound(newSound);
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) setIsPlaying(false);
        });
      }
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound', error);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const getUrgencyColor = () => {
    switch (report.urgency_level) {
      case 'Immediate':
      case 'Critical': return colors.error;
      case 'Moderate': return colors.warning;
      default: return colors.success;
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('volunteer.scan.reportDetails')} showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getUrgencyColor() + '20' }]}>
            <Text style={[styles.statusText, { color: getUrgencyColor() }]}>{report.status || 'Open'}</Text>
          </View>
          <Text style={styles.dateText}>{report.created_at || 'Recently submitted'}</Text>
        </View>

        {/* Multimedia Card */}
        {report.photo_url && (
          <View style={styles.imageCard}>
            <Image source={{ uri: report.photo_url }} style={styles.reportImage} />
          </View>
        )}

        {/* Main Details */}
        <View style={[globalStyles.card, styles.detailCard]}>
          <DynamicText 
            text={report.primary_category} 
            style={styles.categoryTitle} 
          />
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <DynamicText 
              text={report.precise_location} 
              style={styles.locationText} 
            />
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.descriptionLabel}>{t('volunteer.scan.executiveSummary')}</Text>
          <DynamicText 
            text={report.description || t('common.noData')} 
            style={styles.descriptionText} 
          />
        </View>

        {/* Audio Section */}
        {report.audio_url && (
          <View style={[globalStyles.card, styles.audioCard]}>
            <SectionTitle title={t('survey.voiceNote')} />
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={isPlaying ? stopSound : playSound}
            >
              <Ionicons 
                name={isPlaying ? "pause-circle" : "play-circle"} 
                size={48} 
                color={colors.primarySaffron} 
              />
              <Text style={styles.playButtonText}>
                {isPlaying ? t('survey.stopRecording') : t('survey.audioAttached')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feedback / Steps */}
        <SectionTitle title={t('volunteer.scan.aiRecommendations')} />
        <View style={[globalStyles.card, styles.feedbackCard]}>
           <Text style={styles.feedbackText}>
             {report.status === 'Open' 
               ? "Your report has been received and is waiting for a volunteer to verify. You will be notified of any updates."
               : "A volunteer has been assigned to this issue. Please stay tuned for progress updates."}
           </Text>
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...typography.captionText,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dateText: {
    ...typography.captionText,
    color: colors.textSecondary,
  },
  imageCard: {
    margin: spacing.md,
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    elevation: 3,
  },
  reportImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailCard: {
    margin: spacing.md,
    padding: spacing.lg,
  },
  categoryTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationText: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.textSecondary + '20',
    marginVertical: spacing.md,
  },
  descriptionLabel: {
    ...typography.headingSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  descriptionText: {
    ...typography.bodyText,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  audioCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySaffron + '10',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  playButtonText: {
    ...typography.bodyText,
    marginLeft: spacing.md,
    color: colors.primarySaffron,
    fontWeight: '600',
  },
  feedbackCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentBlue,
  },
  feedbackText: {
    ...typography.bodyText,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
});
