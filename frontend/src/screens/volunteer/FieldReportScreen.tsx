import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';
import { AppHeader, PrimaryButton } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';
import { uploadToCloudinary, uploadSurveyMediaViaBackend } from '../../services/api/uploadToCloudinary';

export const FieldReportScreen = ({ onBack }: { onBack: () => void }) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(`${loc.coords.latitude.toFixed(4)},${loc.coords.longitude.toFixed(4)}`);
      }
    })();
  }, []);

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const mp3Options = {
        isMeteringEnabled: true,
        android: {
          extension: '.mp3',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.mp3',
          audioQuality: 96, // HIGH
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/mpeg',
          bitsPerSecond: 128000,
        }
      };

      const { recording } = await Audio.Recording.createAsync(mp3Options as any);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
    setRecording(null);
  };

  const handleSubmit = async () => {
    if (!photoUri || !audioUri) {
      Alert.alert('Incomplete', 'Please provide both a photo and a voice note.');
      return;
    }
    setLoading(true);
    try {
      // 1. Synthesize Report via Gemini & Whisper
      const formData = new FormData();
      // @ts-ignore
      formData.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' });
      // @ts-ignore
      formData.append('audio', { uri: audioUri, name: 'audio.mp3', type: 'audio/mpeg' });
      if (location) formData.append('location', location);

      const res = await fetch(`${API_BASE_URL}/field-report`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await res.json();

      if (data.success) {
        // 2. Upload media to Cloudinary (Survey Folder)
        let photo_url, audio_url, photo_public_id, audio_public_id;

        try {
          console.log('[FieldReport] Uploading photo to Cloudinary...');
          const pRes = await uploadToCloudinary(photoUri, 'image/jpeg', 'photo.jpg', 'sevasetu/survey');
          photo_url = pRes.url;
          photo_public_id = pRes.publicId;

          console.log('[FieldReport] Uploading audio to Cloudinary...');
          const aRes = await uploadSurveyMediaViaBackend(audioUri, 'audio.mp3', 'audio/mpeg', API_BASE_URL);
          audio_url = aRes.url;
          audio_public_id = aRes.publicId;
        } catch (e) {
          console.warn('Media upload failed, using local URIs as risky fallback', e);
          photo_url = photoUri;
          audio_url = audioUri;
        }

        // 3. Save to DB
        const payload = {
          ...data.parsed_data,
          volunteer_id: 'vol_123',
          report_source: 'field_report',
          photo_url,
          photo_public_id,
          audio_url,
          audio_public_id
        };
        const submitRes = await fetch(`${API_BASE_URL}/submit-report`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const submitData = await submitRes.json();

        if (submitData.success) {
          setReportGenerated(true);
        } else {
          throw new Error(submitData.detail);
        }
      } else {
        throw new Error(data.detail);
      }
    } catch (e: any) {
      Alert.alert('Error generating report', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (reportGenerated) {
    return (
      <View style={styles.container}>
        <AppHeader title="Report Generated" showBack onBackPress={onBack} />
        <View style={styles.successContainer}>
          <Feather name="check-circle" size={80} color={colors.success} />
          <Text style={styles.successTitle}>Successfully Logged</Text>
          <Text style={styles.successDesc}>The AI has structured your field observation into a comprehensive report.</Text>
          <PrimaryButton title="Done" onPress={onBack} style={{ marginTop: spacing.xl }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="New Field Report" showBack onBackPress={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Capture Evidence</Text>
          {photoUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: photoUri }} style={styles.image} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotoUri(null)}>
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
              <Feather name="camera" size={32} color={colors.primaryGreen} />
              <Text style={styles.actionText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Record Voice Note</Text>
          <Text style={styles.cardDesc}>Describe what you see, the community's response, and urgency.</Text>

          <View style={styles.audioRow}>
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordingActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Feather name={isRecording ? 'square' : 'mic'} size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.audioStatus}>
              {isRecording ? (
                <Text style={styles.recordingText}>Recording...</Text>
              ) : audioUri ? (
                <View style={styles.audioSuccess}>
                  <Feather name="check" size={16} color={colors.success} />
                  <Text style={styles.recordedText}>Voice Note Saved</Text>
                </View>
              ) : (
                <Text style={styles.idleText}>Tap to start speaking</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Location Tagging</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={20} color={colors.accentBlue} />
            <Text style={styles.locationText}>{location || 'Locating...'}</Text>
          </View>
        </View>

        <PrimaryButton
          title={loading ? 'AI is analyzing...' : 'Generate Field Report'}
          onPress={handleSubmit}
          disabled={loading || !photoUri || !audioUri}
          style={styles.submitBtn}
        />

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20, padding: spacing.lg, marginBottom: spacing.lg,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  cardTitle: { ...typography.headingSmall, color: colors.textPrimary, marginBottom: spacing.xs },
  cardDesc: { ...typography.captionText, color: colors.textSecondary, marginBottom: spacing.md },

  actionBtn: {
    height: 120, backgroundColor: colors.primaryGreen + '15', borderRadius: 16,
    borderWidth: 1, borderColor: colors.primaryGreen, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  actionText: { ...typography.bodyText, color: colors.primaryGreen, marginTop: spacing.xs, fontWeight: '600' },

  imageWrap: { height: 200, borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },

  audioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryGreen, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  recordingActive: { backgroundColor: colors.error },
  audioStatus: { flex: 1 },
  recordingText: { ...typography.bodyText, color: colors.error, fontWeight: '700' },
  idleText: { ...typography.bodyText, color: colors.textSecondary },
  audioSuccess: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordedText: { ...typography.bodyText, color: colors.success, fontWeight: '600' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accentBlue + '10', padding: spacing.md, borderRadius: 12 },
  locationText: { ...typography.bodyText, color: colors.accentBlue, fontWeight: '600' },

  submitBtn: { marginTop: spacing.md, marginBottom: spacing.xxl },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  successTitle: { ...typography.headingLarge, color: colors.textPrimary, marginTop: spacing.lg },
  successDesc: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
