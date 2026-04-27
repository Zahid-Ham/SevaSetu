import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { AppHeader, PrimaryButton, ConfettiOverlay, StatusModal } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LottieSuccess, LottieLoading } from '../../components/common/LottieAnimations';
import { useLanguage } from '../../context/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAuthStore } from '../../services/store/useAuthStore';
import { API_BASE_URL } from '../../config/apiConfig';

type IssueType = 'Water Shortage' | 'Food Assistance' | 'Medical Help' | 'Education' | 'Other';

export const ReportIssueScreen = () => {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  // Multimedia State
  const [image, setImage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'error' as const, title: '', message: '' });

  const ISSUE_CATEGORIES: { label: IssueType, key: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'Water Shortage', key: 'waterShortage', icon: 'water' },
    { label: 'Food Assistance', key: 'foodAssistance', icon: 'restaurant' },
    { label: 'Medical Help', key: 'medicalHelp', icon: 'medical' },
    { label: 'Education', key: 'education', icon: 'book' },
    { label: 'Other', key: 'other', icon: 'ellipsis-horizontal-circle' },
  ];

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setRecording(null);
    setIsRecording(false);
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    Alert.alert('Success', 'Location captured successfully');
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    setStatus('loading');

    try {
      let photoUrl = '';
      let audioUrl = '';

      // 1. Upload Photo if exists
      if (image) {
        const formData = new FormData();
        formData.append('file', {
          uri: image,
          name: 'photo.jpg',
          type: 'image/jpeg',
        } as any);

        const res = await axios.post(`${API_BASE_URL}/upload-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoUrl = res.data.url;
      }

      // 2. Upload Audio if exists
      if (audioUri) {
        const formData = new FormData();
        formData.append('file', {
          uri: audioUri,
          name: 'voice.m4a',
          type: 'audio/m4a',
        } as any);

        const res = await axios.post(`${API_BASE_URL}/upload-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        audioUrl = res.data.url;
      }

      // 3. Submit Full Report
      const reportData = {
        citizen_name: user?.name || 'Anonymous Citizen',
        citizen_id: user?.id || 'anonymous',
        phone: user?.email || '', // Using email as phone if not available
        precise_location: location ? `${location.coords.latitude}, ${location.coords.longitude}` : 'Unknown',
        gps_coordinates: location ? `${location.coords.latitude}, ${location.coords.longitude}` : '',
        primary_category: selectedType,
        description: description,
        report_source: 'citizen_report',
        status: 'Open',
        photo_url: photoUrl,
        audio_url: audioUrl,
        urgency_level: 'Moderate'
      };

      await axios.post(`${API_BASE_URL}/submit-report`, reportData);
      setStatus('success');
      
      // Reset state
      setTimeout(() => {
        setStatus('idle');
        setSelectedType(null);
        setDescription('');
        setImage(null);
        setAudioUri(null);
        setLocation(null);
      }, 4000);

    } catch (error: any) {
      console.error('Submission error:', error);
      setStatus('idle');
      setModalConfig({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.detail || 'Failed to submit report. Please try again.'
      });
      setModalVisible(true);
    }
  };

  if (status === 'success') {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <LottieSuccess message={t('citizen.reportIssue.successMessage')} size={200} />
        <PrimaryButton
          title={t('citizen.reportIssue.reportAnother')}
          onPress={() => { setStatus('idle'); setSelectedType(null); setDescription(''); }}
          style={styles.backBtn}
        />
        <ConfettiOverlay play={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={t('citizen.reportIssue.title')} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={[globalStyles.card, styles.promptCard]}>
          <Text style={typography.headingMedium}>{t('citizen.reportIssue.whatIssue')}</Text>
          <Text style={styles.subtitle}>{t('citizen.reportIssue.selectCategory')}</Text>
          
          <View style={styles.categoriesGrid}>
            {ISSUE_CATEGORIES.map((cat) => {
              const isSelected = selectedType === cat.label;
              return (
                <TouchableOpacity 
                  key={cat.label}
                  activeOpacity={0.7}
                  style={[styles.categoryBtn, isSelected && styles.categoryBtnSelected]}
                  onPress={() => setSelectedType(cat.label)}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={24} 
                    color={isSelected ? colors.cardBackground : colors.accentBlue} 
                  />
                  <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextSelected]}>
                    {t(`citizen.reportIssue.${cat.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.mediaSection}>
          <TouchableOpacity 
            style={[styles.actionBtn, image && styles.actionBtnActive]}
            onPress={pickImage}
          >
            <Ionicons name={image ? "checkmark-circle" : "camera-outline"} size={24} color={image ? colors.success : colors.textPrimary} />
            <Text style={styles.actionBtnText}>{image ? t('citizen.reportIssue.photoAdded') : t('citizen.reportIssue.addPhoto')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, (isRecording || audioUri) && styles.actionBtnActive]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons 
              name={isRecording ? "stop-circle" : (audioUri ? "checkmark-circle" : "mic-outline")} 
              size={24} 
              color={isRecording ? colors.error : (audioUri ? colors.success : colors.textPrimary)} 
            />
            <Text style={styles.actionBtnText}>
              {isRecording ? t('citizen.reportIssue.recording') : (audioUri ? t('citizen.reportIssue.voiceAdded') : t('citizen.reportIssue.voiceDescription'))}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, location && styles.actionBtnActive]}
            onPress={getCurrentLocation}
          >
            <Ionicons name={location ? "checkmark-circle" : "location-outline"} size={24} color={location ? colors.success : colors.textPrimary} />
            <Text style={styles.actionBtnText}>{location ? t('citizen.reportIssue.locationAdded') : t('citizen.reportIssue.addLocation')}</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removePreview} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={typography.headingSmall}>{t('citizen.reportIssue.additionalDetails')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('citizen.reportIssue.descriptionPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.submitContainer}>
          {status === 'loading' ? (
            <LottieLoading message={t('citizen.reportIssue.submittingReport')} size={80} />
          ) : (
            <PrimaryButton 
              title={t('citizen.reportIssue.submitReport')} 
              onPress={handleSubmit} 
              style={[styles.submitBtn, !selectedType && styles.submitBtnDisabled]}
              disabled={!selectedType}
            />
          )}
        </View>
      </ScrollView>

      <StatusModal
        visible={modalVisible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={() => setModalVisible(false)}
      />
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
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  promptCard: {
    margin: spacing.md,
    padding: spacing.lg,
  },
  subtitle: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBlue + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  categoryBtnSelected: {
    backgroundColor: colors.accentBlue,
  },
  categoryBtnText: {
    ...typography.bodyText,
    color: colors.accentBlue,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  categoryBtnTextSelected: {
    color: colors.cardBackground,
  },
  mediaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  actionBtn: {
    backgroundColor: colors.cardBackground,
    flex: 1,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnActive: {
    borderColor: colors.success + '40',
    backgroundColor: colors.success + '05',
  },
  actionBtnText: {
    ...typography.captionText,
    marginTop: spacing.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  previewContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 150,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePreview: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  inputSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  textInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    height: 120,
    ...typography.bodyText,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
  },
  submitContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  submitBtn: {
    width: '100%',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  backBtn: {
    width: '100%',
    marginTop: spacing.lg,
  },
});
