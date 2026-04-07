import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, 
  Alert, TextInput, Animated, Dimensions, ActivityIndicator,
  Modal, Share, Platform, Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { AppHeader, PrimaryButton } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';
import { reportStorage } from '../../services/storage/reportStorage';

const { width } = Dimensions.get('window');

// --- Types ---
type Step = 'TYPE_SELECTION' | 'BASIC_DETAILS' | 'LIVE_FEED' | 'COMMUNITY_INPUT' | 'FINAL_REPORT';
type ReportType = 'Community Survey' | 'Field Observation Report' | 'Event Report';

interface FeedItem {
  id: string;
  type: 'audio' | 'video' | 'image' | 'pdf' | 'note' | 'community';
  timestamp: string;
  url?: string;
  summary: string;
  status: 'uploading' | 'ready' | 'error';
  localUri?: string;
  data?: any; // For community member details
}

// --- Constants ---
const REPORT_TYPES = [
  { 
    id: 'Community Survey' as ReportType, 
    icon: 'users', 
    title: 'Community Survey', 
    desc: 'Use for periodic area checks or structured house-to-house data gathering.' 
  },
  { 
    id: 'Field Observation Report' as ReportType, 
    icon: 'eye', 
    title: 'Field Observation Report', 
    desc: 'Use for reporting specific incidents, infrastructure damage, or active issues.' 
  },
  { 
    id: 'Event Report' as ReportType, 
    icon: 'calendar', 
    title: 'Event Report', 
    desc: 'Use to document NGO events, distribution drives, or community meetings.' 
  }
];

export const FieldReportScreen = ({ onBack, onComplete }: { onBack: () => void; onComplete?: () => void }) => {
  // Navigation & UI State
  const [step, setStep] = useState<Step>('TYPE_SELECTION');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Session Data
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [workerInfo, setWorkerInfo] = useState({ name: '', id: 'VOL_' + Math.floor(Math.random()*9000 + 1000) });
  const [sessionMeta, setSessionMeta] = useState({ title: '', location: '', description: '', dateTime: new Date().toLocaleString() });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [communityInputs, setCommunityInputs] = useState<any[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);

  // Input States
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Location logic
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setSessionMeta(prev => ({ 
          ...prev, 
          location: `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
        }));
      }
    })();
  }, []);

  // Timer logic
  useEffect(() => {
    if (step === 'LIVE_FEED' && !isPaused) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, isPaused]);

  // --- PERSISTENCE LOGIC ---
  // 1. Session Recovery on Mount
  useEffect(() => {
    const checkRecovery = async () => {
      const saved = await reportStorage.loadActiveSession();
      if (saved && saved.feed.length > 0) {
        Alert.alert(
          'Resume Session?',
          `You have an ongoing "${saved.sessionMeta.title || 'Untitled'}" session from ${new Date(saved.lastUpdated).toLocaleTimeString()}.`,
          [
            { text: 'Discard', style: 'destructive', onPress: () => reportStorage.clearActiveSession() },
            { 
              text: 'Resume', 
              onPress: () => {
                setReportType(saved.reportType);
                setSessionMeta(saved.sessionMeta);
                setFeed(saved.feed);
                setCommunityInputs(saved.communityInputs || []);
                setStep('LIVE_FEED');
              } 
            }
          ]
        );
      }
    };
    checkRecovery();
  }, []);

  // 2. Auto-Save on State Changes
  useEffect(() => {
    if (step === 'LIVE_FEED' || step === 'BASIC_DETAILS' || step === 'COMMUNITY_INPUT') {
      reportStorage.saveActiveSession({
        sessionMeta,
        feed,
        communityInputs,
        reportType: reportType as string
      });
    }
  }, [sessionMeta, feed, communityInputs, reportType, step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Actions ---

  // Background Upload Logic
  const triggerBackgroundUpload = async (item: FeedItem) => {
    if (item.type === 'note' || !item.localUri) return;

    try {
      const formData = new FormData();
      const filename = item.localUri.split('/').pop() || `file_${item.id}`;
      
      // @ts-ignore
      formData.append('file', {
        uri: item.localUri,
        name: `${item.type}_${filename}`,
        type: item.type === 'pdf' ? 'application/pdf' : 
              item.type === 'image' ? 'image/jpeg' : 
              item.type === 'video' ? 'video/mp4' : 'audio/mpeg'
      });
      formData.append('type', item.type);

      const res = await fetch(`${API_BASE_URL}/field-report/process-item`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await res.json();
      if (data.success) {
        setFeed(prev => prev.map(i => i.id === item.id ? {
          ...i,
          status: 'ready',
          url: data.url,
          summary: data.summary || i.summary
        } : i));
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.warn('[BackgroundUpload] Failed:', err);
      setFeed(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
    }
  };

  // Store items locally and trigger background processing
  const addFeedItem = (type: FeedItem['type'], localUri?: string, extraData?: any) => {
    const labels: Record<string, string> = {
      audio: '🎤 Syncing voice note...',
      video: '🎥 Syncing video...',
      image: '📸 Syncing photo...',
      pdf: '📄 Syncing document...',
      note: extraData || 'Note added',
    };
    const newItem: FeedItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: type === 'note' ? 'ready' : 'uploading',
      localUri,
      summary: labels[type] || 'Item added',
      data: extraData,
    };
    
    setFeed(prev => [newItem, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Trigger async background processing for media
    if (type !== 'note') {
      triggerBackgroundUpload(newItem);
    }
  };

  // Recording Logic — safely stop any active recording first
  const stopActiveRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (_) { /* already stopped */ }
      setRecording(null);
    }
    setIsRecording(false);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (!recording) return;
      setIsRecording(false);
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.warn('Audio stop err:', e);
      }
      const uri = recording.getURI();
      setRecording(null);
      if (uri) addFeedItem('audio', uri);
    } else {
      if (recording) return; // Prevent double trigger
      setIsRecording(true); // Optimistic lock
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          setIsRecording(false);
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        
        const mp3Options = {
          android: { extension: '.mp3', outputFormat: 2, audioEncoder: 3, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
          ios: { extension: '.mp3', audioQuality: 96, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
          web: { mimeType: 'audio/mpeg', bitsPerSecond: 128000 }
        };

        try {
          const { recording: newRec } = await Audio.Recording.createAsync(mp3Options as any);
          setRecording(newRec);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (createErr) {
          console.error("Failed to prepare recording:", createErr);
          setIsRecording(false);
          setRecording(null);
          alert("Could not start recording. Another recording might be active.");
        }
      } catch (err) {
        console.error(err);
        setIsRecording(false);
      }
    }
  };

  const handleCapturePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) addFeedItem('image', result.assets[0].uri);
  };

  const handleCaptureVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7, videoMaxDuration: 120 });
    if (!result.canceled) addFeedItem('video', result.assets[0].uri);
  };

  const handlePickFile = async () => {
     const result = await DocumentPicker.getDocumentAsync({ type: ['*/*'] });
     if (!result.canceled) {
       const type = result.assets[0].mimeType?.startsWith('image') ? 'image' : 
                    result.assets[0].mimeType?.startsWith('audio') ? 'audio' :
                    result.assets[0].mimeType?.startsWith('video') ? 'video' : 'pdf';
       addFeedItem(type as any, result.assets[0].uri);
     }
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addFeedItem('note', undefined, noteText);
    setNoteText('');
    setShowNoteInput(false);
  };

  // --- End Session: Upload ALL files + Generate Report ---
  // --- End Session: Save Locally + Attempt Sync ---
  const handleEndSession = async () => {
    setLoading(true);
    try {
      await stopActiveRecording();

      // 1. Prepare Report Object
      const reportData = {
        timestamp: new Date().toISOString(),
        reportType: reportType as string,
        sessionMeta: {
          ...sessionMeta,
          type: reportType,
          workerId: workerInfo.id,
          workerName: workerInfo.name,
          duration: formatTime(timer)
        },
        feed: feed.map(i => ({
          ...i,
          localUri: i.localUri || null
        })),
        communityInputs: communityInputs || [],
        duration: formatTime(timer)
      };

      // 2. Add to Sync Queue (PERSISTENCE)
      const queueItem = await reportStorage.addToSyncQueue(reportData);
      if (!queueItem) throw new Error('Failed to save report locally');

      // 3. Attempt Live Sync
      try {
        const formData = new FormData();
        formData.append('session_details', JSON.stringify(reportData.sessionMeta));
        
        // Only mark as 'has_file' if it's NOT already synced
        formData.append('feed_items', JSON.stringify(feed.map(i => ({
          ...i,
          localUri: (i.localUri && i.status !== 'ready') ? 'has_file' : null
        }))));
        
        formData.append('community_inputs', JSON.stringify(reportData.communityInputs));

        let fileIndex = 0;
        // Feed Items
        for (const item of feed) {
          if (item.localUri && item.status !== 'ready') {
            const filename = item.localUri.split('/').pop() || `file_${fileIndex}`;
            // @ts-ignore
            formData.append('files', { 
              uri: item.localUri, 
              name: `${item.type}_${fileIndex}_${filename}`, 
              type: 'application/octet-stream' 
            });
            fileIndex++;
          }
        }

        // Community Media
        communityInputs.forEach((ci, idx) => {
          if (ci.media?.audioUri) {
            // @ts-ignore
            formData.append('files', {
              uri: ci.media.audioUri,
              name: `community_audio_${idx}.mp3`,
              type: 'audio/mpeg'
            });
          }
          if (ci.media?.photoUri) {
            // @ts-ignore
            formData.append('files', {
              uri: ci.media.photoUri,
              name: `community_photo_${idx}.jpg`,
              type: 'image/jpeg'
            });
          }
        });

        const res = await fetch(`${API_BASE_URL}/field-report/finalize`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const data = await res.json();
        if (data.success) {
          // Success! Clear everything
          await reportStorage.removeFromQueue(queueItem.id);
          await reportStorage.clearActiveSession();
          setFinalReport(data.report);
          setStep('FINAL_REPORT');
          Alert.alert('Report Synced', 'Your field report has been successfully uploaded.');
        } else {
          throw new Error('Server error during sync');
        }
      } catch (syncErr) {
        // FAIL: Stay in queue
        console.warn('[handleEndSession] Offline/Sync Failed:', syncErr);
        await reportStorage.clearActiveSession(); // Clear active to allow new ones, but it's in queue
        Alert.alert(
          'Offline Mode',
          'Connection failed. Your report has been saved to the Sync Dashboard and will be uploaded once you are back online.',
          [{ text: 'OK', onPress: () => { if (onComplete) onComplete(); onBack(); } }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process report');
    } finally {
      setLoading(false);
    }
  };

  // --- Rendering UI ---

  const renderTypeSelection = () => (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.stepTitle}>Select Report Type</Text>
      <Text style={styles.stepSubtitle}>Identify the nature of this field session</Text>
      
      {REPORT_TYPES.map(item => (
        <TouchableOpacity 
          key={item.id} 
          style={styles.typeCard}
          onPress={() => {
            setReportType(item.id);
            setStep('BASIC_DETAILS');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={[styles.typeIconBox, { backgroundColor: colors.primaryGreen + '15' }]}>
            <Feather name={item.icon as any} size={28} color={colors.primaryGreen} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.typeTitle}>{item.title}</Text>
            <Text style={styles.typeDesc}>{item.desc}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderBasicDetails = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.stepTitle}>Session Details</Text>
      <Text style={styles.stepSubtitle}>Quick setup before you start collecting data</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Field Worker Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter your name" 
          value={workerInfo.name} 
          onChangeText={t => setWorkerInfo({ ...workerInfo, name: t })} 
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Worker ID</Text>
        <TextInput style={[styles.input, { backgroundColor: '#f0f0f0' }]} value={workerInfo.id} editable={false} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Session Title</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Ward 4 Water Survey" 
          value={sessionMeta.title} 
          onChangeText={t => setSessionMeta({ ...sessionMeta, title: t })} 
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Location (Captured)</Text>
        <TextInput 
          style={styles.input} 
          value={sessionMeta.location} 
          onChangeText={t => setSessionMeta({ ...sessionMeta, location: t })} 
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Quick Description</Text>
        <TextInput 
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
          placeholder="Describe the objective in 2-3 sentences" 
          multiline 
          value={sessionMeta.description} 
          onChangeText={t => setSessionMeta({ ...sessionMeta, description: t })} 
        />
      </View>

      <PrimaryButton 
        title="Start Live Notebook" 
        onPress={() => setStep('LIVE_FEED')} 
        disabled={!workerInfo.name || !sessionMeta.title}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );

  const renderLiveFeed = () => (
    <View style={{ flex: 1 }}>
      {/* Session Header */}
      <View style={styles.feedHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle} numberOfLines={1}>{sessionMeta.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={12} color={colors.accentBlue} />
            <Text style={styles.feedLocation}>{sessionMeta.location}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.timerBadge, isPaused && { backgroundColor: colors.primarySaffron + '15' }]}
          onPress={() => setIsPaused(!isPaused)}
          activeOpacity={0.7}
        >
          <Feather name={isPaused ? 'play' : 'pause'} size={12} color={isPaused ? colors.primarySaffron : colors.primaryGreen} />
          <Text style={[styles.timerText, isPaused && { color: colors.primarySaffron }]}>{formatTime(timer)}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Feed */}
      <ScrollView 
        style={styles.feedScroll} 
        contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {feed.length === 0 && (
          <View style={styles.emptyFeed}>
            <Feather name="book-open" size={48} color={colors.textSecondary + '40'} />
            <Text style={styles.emptyFeedText}>Notebook is empty. Tap icons below to start collecting.</Text>
          </View>
        )}
        
        {feed.map(item => (
          <View key={item.id} style={styles.feedItem}>
            <View style={styles.itemMeta}>
              <View style={[styles.itemIcon, { backgroundColor: getItemColor(item.type) + '15' }]}>
                <Feather name={getItemIcon(item.type) as any} size={14} color={getItemColor(item.type)} />
              </View>
              <Text style={styles.itemTime}>{item.timestamp}</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setFeed(f => f.filter(i => i.id !== item.id))}>
                <Feather name="trash-2" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.itemBody}>
              {item.status === 'uploading' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primaryGreen} style={{ marginRight: 8 }} />
                  <Text style={[styles.itemSummary, { color: colors.textSecondary }]}>{item.summary}</Text>
                </View>
              ) : item.status === 'error' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="alert-circle" size={14} color={colors.error} style={{ marginRight: 8 }} />
                  <Text style={[styles.itemSummary, { color: colors.error }]}>Sync failed. Retrying at end...</Text>
                </View>
              ) : (
                <Text style={styles.itemSummary}>{item.summary}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Community Button */}
      <TouchableOpacity 
        style={styles.communityFab}
        onPress={async () => {
          // Stop any active main recording before opening community input
          await stopActiveRecording();
          setStep('COMMUNITY_INPUT');
        }}
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={styles.communityFabText}>Add Community Input</Text>
      </TouchableOpacity>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <ActionIcon icon="mic" label="Audio" onPress={toggleRecording} active={isRecording} />
        <ActionIcon icon="camera" label="Photo" onPress={handleCapturePhoto} />
        <ActionIcon icon="video" label="Video" onPress={handleCaptureVideo} />
        <ActionIcon icon="upload" label="File" onPress={handlePickFile} />
        <ActionIcon icon="edit-3" label="Note" onPress={() => setShowNoteInput(true)} />
      </View>

      {/* Paused Overlay */}
      {isPaused && (
        <View style={styles.pausedOverlay}>
          <View style={styles.pausedBadge}>
            <Feather name="pause-circle" size={28} color={colors.primarySaffron} />
            <Text style={styles.pausedTitle}>Session Paused</Text>
            <Text style={styles.pausedSubtext}>Tap resume to continue capturing evidence</Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={() => setIsPaused(false)}>
              <Feather name="play" size={18} color="#fff" />
              <Text style={styles.resumeBtnText}>Resume Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PrimaryButton 
        title={loading ? "Generating..." : "End Session & Generate Report"} 
        onPress={handleEndSession}
        style={styles.footerBtn}
        disabled={feed.length === 0 || loading || isPaused}
      />

      {/* Recording Overlay with Stop Button */}
      {isRecording && (
        <View style={styles.recordingOverlay}>
          <View style={styles.recordingPulse}>
            <View style={styles.recordingPulseInner} />
          </View>
          <Text style={styles.recordingOverlayText}>Recording Field Notes...</Text>
          <TouchableOpacity 
            style={styles.stopRecordingBtn}
            onPress={toggleRecording}
          >
            <Feather name="square" size={18} color="#fff" />
            <Text style={styles.stopRecordingBtnText}>Stop Recording</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Note Input Modal */}
      <Modal visible={showNoteInput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.noteModal}>
            <Text style={styles.modalTitle}>Quick Note</Text>
            <TextInput 
              style={styles.noteInput} 
              multiline 
              autoFocus 
              placeholder="Type your observation..."
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowNoteInput(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddNote} style={styles.modalAdd}>
                <Text style={styles.modalAddText}>Add to Feed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  // --- Sub-components for Screens ---

  const CommunityInputForm = ({ 
    onSave, 
    onCancel 
  }: { 
    onSave: (age: string, gender: string, media?: any) => void,
    onCancel: () => void 
  }) => {
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    
    // Media States
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const [inputText, setInputText] = useState('');

    const toggleRecording = async () => {
      if (isRecording) {
        if (!recording) return;
        setIsRecording(false);
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.warn('Audio unload error:', e);
        }
        const uri = recording.getURI();
        setRecording(null);
        if (uri) {
          setAudioUri(uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        if (recording) return; // Prevent rapid double fire
        setIsRecording(true); // Optimistic lock
        try {
          const { status } = await Audio.requestPermissionsAsync();
          if (status !== 'granted') {
            setIsRecording(false);
            return;
          }
          await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
          
          try {
            const { recording: newRec } = await Audio.Recording.createAsync({
              android: { extension: '.mp3', outputFormat: 2, audioEncoder: 3, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
              ios: { extension: '.mp3', audioQuality: 96, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
              web: { mimeType: 'audio/mpeg', bitsPerSecond: 128000 }
            } as any);
            setRecording(newRec);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (createErr) {
            console.error("Community Form recording failed:", createErr);
            setIsRecording(false);
            setRecording(null);
            alert("Could not start recording. Another recording might be active.");
          }
        } catch (err) { 
          console.error(err); 
          setIsRecording(false);
        }
      }
    };

    const handleCapturePhoto = async () => {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    return (
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={styles.stepTitle}>Community Input</Text>
        <Text style={styles.stepSubtitle}>Capture facts and feedback directly from the source</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Approx. Age Range</Text>
          <View style={styles.pillRow}>
            {['18-30', '31-50', '51-70', '70+'].map(a => (
              <TouchableOpacity 
                key={a} 
                style={[styles.pill, age === a && { backgroundColor: colors.primaryGreen }]}
                onPress={() => {
                  setAge(a);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={age === a && { color: '#fff' }}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pillRow}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity 
                key={g} 
                style={[styles.pill, gender === g && { backgroundColor: colors.primaryGreen }]}
                onPress={() => {
                  setGender(g);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={gender === g && { color: '#fff' }}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.label}>Input Method (Capture At Least One)</Text>
        <View style={styles.methodRow}>
          <MethodCard 
            icon="mic" 
            label={isRecording ? "Stop" : audioUri ? "Re-record" : "Record voice"} 
            onPress={toggleRecording} 
            active={isRecording}
            captured={!!audioUri}
          />
          <MethodCard 
            icon="camera" 
            label={photoUri ? "Retake" : "Save photo"} 
            onPress={handleCapturePhoto} 
            captured={!!photoUri}
          />
          <MethodCard 
            icon="type" 
            label="Type input" 
            onPress={() => setShowTextInput(!showTextInput)} 
            captured={!!inputText.trim()}
          />
        </View>

        {showTextInput && (
          <View style={styles.formGroup}>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Type feedback here..."
              multiline
              value={inputText}
              onChangeText={setInputText}
            />
          </View>
        )}

        {(audioUri || photoUri) && (
          <View style={styles.capturePreviewRow}>
            {audioUri && (
              <View style={styles.previewBadge}>
                <Feather name="mic" size={14} color={colors.primarySaffron} />
                <Text style={styles.previewBadgeText}>Voice Clip Ready</Text>
              </View>
            )}
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.previewImageSmall} />
            )}
          </View>
        )}

        <PrimaryButton 
          title="Save Community Input" 
          onPress={() => onSave(age, gender, { audioUri, photoUri, inputText })} 
          disabled={!age || !gender || (!audioUri && !photoUri && !inputText.trim())}
        />
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 15, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Back to Feed</Text>
        </TouchableOpacity>

        {isRecording && (
          <View style={styles.miniRecordingOverlay}>
            <View style={styles.recordingIndicator}>
              <View style={styles.redDot} />
            </View>
            <Text style={{ color: colors.error, fontWeight: '700', fontSize: 12 }}>Recording Community Input...</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // Helper: find Cloudinary URL for an evidence item
  const getMediaUrl = (ev: any) => {
    if (ev.url && typeof ev.url === 'string' && ev.url.startsWith('http')) {
      return ev.url;
    }
    if (!finalReport?.media_library) return null;
    const type = ev.evidence_type?.toLowerCase();
    // Fallback: match by type from media_library
    return finalReport.media_library.find((m: any) => m.type === type)?.url || null;
  };

  const renderFinalReport = () => {
    // Section colors
    const C = {
      orange: '#FF6D00',
      violet: '#7C4DFF',
      blue: '#2979FF',
      green: '#00C853',
      yellow: '#FFB300',
      red: '#FF1744',
      teal: '#00BFA5',
    };
    return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f0f2f5' }} showsVerticalScrollIndicator={false}>
      {/* ── Hero Header ── */}
      <View style={{ backgroundColor: '#1B2838', paddingTop: 30, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <Feather name="check" size={30} color="#fff" />
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 }}>Report Ready</Text>
        <Text style={{ color: C.orange, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{finalReport?.report_type}</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="map-pin" size={12} color="#aaa" />
            <Text style={{ color: '#ccc', fontSize: 11, fontWeight: '600' }}>{finalReport?.location_summary}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="clock" size={12} color="#aaa" />
            <Text style={{ color: '#ccc', fontSize: 11, fontWeight: '600' }}>{finalReport?.metadata?.duration || formatTime(timer)}</Text>
          </View>
        </View>
        {/* Stats */}
        <View style={{ flexDirection: 'row', marginTop: 18, gap: 10, width: '100%' }}>
          {[
            { num: finalReport?.media_library?.length || feed.length, label: 'Evidence', color: C.blue },
            { num: communityInputs.length, label: 'Surveyed', color: C.violet },
            { num: finalReport?.key_findings?.length || 0, label: 'Findings', color: C.orange },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: s.color + '15', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: s.color + '30' }}>
              <Text style={{ color: s.color, fontSize: 22, fontWeight: '900' }}>{s.num}</Text>
              <Text style={{ color: s.color + 'AA', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* ── Executive Summary (Orange) ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
          <View style={{ backgroundColor: C.orange + '12', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.orange + '20' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="file-text" size={13} color="#fff" />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.orange, textTransform: 'uppercase', letterSpacing: 0.5 }}>Executive Summary</Text>
          </View>
          <View style={{ padding: 16 }}>
            {Array.isArray(finalReport?.executive_summary) ? (
              finalReport.executive_summary.map((bullet: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange, marginTop: 6 }} />
                  <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: '#444' }}>{bullet}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 13, lineHeight: 20, color: '#444' }}>{finalReport?.executive_summary}</Text>
            )}
          </View>
        </View>

        {/* ── Evidence Analysis (Blue) ── */}
        {finalReport?.evidence_breakdown && finalReport.evidence_breakdown.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
            <View style={{ backgroundColor: C.blue + '12', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.blue + '20' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="search" size={13} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.blue, textTransform: 'uppercase', letterSpacing: 0.5 }}>Evidence Analysis</Text>
              <View style={{ flex: 1 }} />
              <View style={{ backgroundColor: C.blue + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: C.blue }}>{finalReport.evidence_breakdown.length} items</Text>
              </View>
            </View>
            <View style={{ padding: 12 }}>
              {finalReport.evidence_breakdown.map((ev: any, i: number) => {
                const mediaUrl = getMediaUrl(ev);
                const evType = ev.evidence_type?.toLowerCase() || 'note';
                const evColor = getItemColor(evType);
                return (
                  <View key={i} style={{ backgroundColor: evColor + '08', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: evColor }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: evColor + '18', justifyContent: 'center', alignItems: 'center' }}>
                        <Feather name={getItemIcon(evType) as any} size={16} color={evColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: '#333' }}>{ev.evidence_label || ev.evidence_type}</Text>
                        <Text style={{ fontSize: 9, color: evColor, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 }}>{ev.evidence_type}</Text>
                      </View>
                      {mediaUrl && (
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blue + '12', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => Linking.openURL(mediaUrl)}
                        >
                          <Feather name="eye" size={12} color={C.blue} />
                          <Text style={{ fontSize: 11, color: C.blue, fontWeight: '700' }}>View</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {ev.three_line_extraction?.map((line: string, j: number) => (
                      <Text key={j} style={{ fontSize: 12, color: '#555', lineHeight: 18, paddingLeft: 42, marginBottom: 3 }}>• {line}</Text>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Conclusion (Green) ── */}
        {finalReport?.evidence_conclusion && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2, borderLeftWidth: 4, borderLeftColor: C.green }}>
            <View style={{ backgroundColor: C.green + '10', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.green + '20' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="check-circle" size={13} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>Conclusion</Text>
            </View>
            <View style={{ padding: 16 }}>
              {Array.isArray(finalReport.evidence_conclusion) ? (
                finalReport.evidence_conclusion.map((bullet: string, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green, marginTop: 6 }} />
                    <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: '#444' }}>{bullet}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 13, lineHeight: 20, color: '#444' }}>{finalReport.evidence_conclusion}</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Key Findings (Yellow) ── */}
        {finalReport?.key_findings && finalReport.key_findings.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
            <View style={{ backgroundColor: C.yellow + '15', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.yellow + '25' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="zap" size={13} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#E65100', textTransform: 'uppercase', letterSpacing: 0.5 }}>Key Findings</Text>
            </View>
            <View style={{ padding: 14 }}>
              {finalReport.key_findings.map((f: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow + '20', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#E65100' }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#333' }}>{f.category}</Text>
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 18 }}>{f.observation}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Needs Assessment (Red) ── */}
        {finalReport?.needs_assessment && finalReport.needs_assessment.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
            <View style={{ backgroundColor: C.red + '0A', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.red + '15' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="alert-triangle" size={13} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.red, textTransform: 'uppercase', letterSpacing: 0.5 }}>Needs Assessment</Text>
            </View>
            <View style={{ padding: 12 }}>
              {finalReport.needs_assessment.map((n: any, i: number) => {
                const isCrit = n.severity === 'High' || n.severity === 'Critical';
                return (
                  <View key={i} style={{ backgroundColor: isCrit ? C.red + '06' : '#f8f9fa', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: isCrit ? C.red : C.teal }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, flex: 1, color: '#333' }}>{n.need}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isCrit ? C.red + '15' : C.teal + '15' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isCrit ? C.red : C.teal }}>{n.severity}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 17 }}>{n.rationale}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Community Voice (Violet) ── */}
        {finalReport?.community_voice && finalReport.community_voice.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
            <View style={{ backgroundColor: C.violet + '10', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.violet + '20' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.violet, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="message-circle" size={13} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.violet, textTransform: 'uppercase', letterSpacing: 0.5 }}>Community Voice</Text>
            </View>
            <View style={{ padding: 12 }}>
              {finalReport.community_voice.map((cv: any, i: number) => (
                <View key={i} style={{ backgroundColor: C.violet + '06', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.violet }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.violet + '18', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="user" size={11} color={C.violet} />
                    </View>
                    <Text style={{ fontWeight: '700', fontSize: 13, flex: 1, color: '#333' }}>{cv.member}</Text>
                    {cv.media_captured && (
                      <Text style={{ fontSize: 9, color: C.violet, backgroundColor: C.violet + '12', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '700', textTransform: 'uppercase' }}>{cv.media_captured}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: '#555', lineHeight: 18 }}>{cv.summary}</Text>
                  {cv.notable_quote && (
                    <View style={{ backgroundColor: C.violet + '08', borderRadius: 8, padding: 8, marginTop: 6 }}>
                      <Text style={{ fontSize: 12, color: C.violet, fontStyle: 'italic' }}>"{cv.notable_quote}"</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Follow-up (Teal) ── */}
        {finalReport?.recommended_follow_up && finalReport.recommended_follow_up.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
            <View style={{ backgroundColor: C.teal + '10', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.teal + '20' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.teal, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="arrow-right-circle" size={13} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>Follow-up Actions</Text>
            </View>
            <View style={{ padding: 14 }}>
              {finalReport.recommended_follow_up.map((item: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.teal + '15', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                    <Feather name="chevron-right" size={12} color={C.teal} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: '#444', lineHeight: 19 }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1B2838', padding: 14, borderRadius: 12 }}
            onPress={() => Share.share({ message: JSON.stringify(finalReport, null, 2) })}
          >
            <Feather name="share-2" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' }}>
            <Feather name="download" size={16} color="#333" />
            <Text style={{ color: '#333', fontWeight: '700', fontSize: 13 }}>Download</Text>
          </TouchableOpacity>
        </View>

        <PrimaryButton title="Done" onPress={() => { if (onComplete) onComplete(); onBack(); }} style={{ marginVertical: 20 }} />
      </View>
    </ScrollView>
    );
  };


  return (
    <View style={styles.container}>
      <AppHeader 
        title={step === 'TYPE_SELECTION' ? 'New Field Report' : reportType || 'Survey Session'} 
        showBack 
        onBackPress={() => {
          if (step === 'TYPE_SELECTION') onBack();
          else if (step === 'BASIC_DETAILS') setStep('TYPE_SELECTION');
          else if (step === 'LIVE_FEED') Alert.alert('Exit Session?', 'All unsaved field notes will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: onBack }
          ]);
          else setStep('LIVE_FEED');
        }} 
      />

      {step === 'TYPE_SELECTION' && renderTypeSelection()}
      {step === 'BASIC_DETAILS' && renderBasicDetails()}
      {step === 'LIVE_FEED' && renderLiveFeed()}
      {step === 'COMMUNITY_INPUT' && (
        <CommunityInputForm 
          onCancel={() => setStep('LIVE_FEED')}
          onSave={(age, gender, media) => {
            const input = { age, gender, media, id: communityInputs.length + 1 };
            setCommunityInputs(prev => [...prev, input]);
            
            let summarySuffix = '';
            if (media?.audioUri) summarySuffix += ' 🎤';
            if (media?.photoUri) summarySuffix += ' 📸';
            if (media?.inputText) summarySuffix += ' 📝';

            // Add to feed as a ready item — NO immediate AI analysis
            // Media URIs are stored in communityInputs and will be
            // processed during "End Session & Generate Report"
            setFeed(f => [{ 
              id: Math.random().toString(), 
              type: 'community', 
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              summary: `Community Member ${input.id} (${input.age}, ${input.gender}) input recorded.${summarySuffix}`,
              status: 'ready',
              localUri: media?.photoUri || media?.audioUri,
              data: media
            }, ...f]);
            
            setStep('LIVE_FEED');
          }}
        />
      )}
      {step === 'FINAL_REPORT' && renderFinalReport()}
    </View>
  );
};

// --- Sub-components ---

const ActionIcon = ({ icon, label, onPress, active }: any) => (
  <TouchableOpacity style={styles.actionIconCell} onPress={onPress}>
    <View style={[styles.actionIconCircle, active && { backgroundColor: colors.error }]}>
      <Feather name={icon} size={24} color={active ? '#fff' : colors.textPrimary} />
    </View>
    <Text style={styles.actionIconLabel}>{label}</Text>
  </TouchableOpacity>
);

const MethodCard = ({ icon, label, onPress, active, captured }: any) => (
  <TouchableOpacity 
    style={[
      styles.methodCard, 
      active && { backgroundColor: colors.error + '20' },
      captured && { backgroundColor: colors.primaryGreen + '20', borderColor: colors.primaryGreen, borderWidth: 1 }
    ]} 
    onPress={onPress}
  >
    <Feather 
      name={icon} 
      size={24} 
      color={active ? colors.error : captured ? colors.primaryGreen : colors.primaryGreen} 
    />
    <Text style={[styles.methodLabel, active && { color: colors.error }, captured && { color: colors.primaryGreen }]}>{label}</Text>
    {captured && (
      <View style={{ position: 'absolute', top: 5, right: 5 }}>
        <Feather name="check-circle" size={12} color={colors.success} />
      </View>
    )}
  </TouchableOpacity>
);

const getItemIcon = (type: string) => {
  switch (type) {
    case 'audio': return 'mic';
    case 'video': return 'video';
    case 'image': return 'camera';
    case 'pdf': return 'file';
    case 'note': return 'edit-3';
    case 'community': return 'user';
    default: return 'file';
  }
};

const getItemColor = (type: string) => {
  switch (type) {
    case 'audio': return colors.primarySaffron;
    case 'video': return colors.error;
    case 'image': return colors.accentBlue;
    case 'pdf': return '#607D8B';
    case 'note': return '#4CAF50';
    case 'community': return '#9C27B0';
    default: return colors.primaryGreen;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 20 },
  stepTitle: { ...typography.headingMedium, color: colors.textPrimary, marginBottom: 4 },
  stepSubtitle: { ...typography.bodyText, color: colors.textSecondary, marginBottom: 24 },

  // Step 1
  typeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground,
    padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2,
    borderWidth: 1, borderColor: '#eee'
  },
  typeIconBox: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  typeTitle: { ...typography.bodyText, fontWeight: '700', fontSize: 16 },
  typeDesc: { ...typography.captionText, marginTop: 2 },

  // Step 2
  formGroup: { marginBottom: 20 },
  label: { ...typography.bodyText, fontWeight: '600', marginBottom: 8, fontSize: 14 },
  input: { 
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#eee', 
    borderRadius: 12, padding: 12, fontSize: 15, color: colors.textPrimary 
  },

  // Step 3
  feedHeader: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  feedTitle: { ...typography.bodyText, fontWeight: '800', fontSize: 16, color: colors.textPrimary },
  feedLocation: { ...typography.captionText, color: colors.accentBlue, marginLeft: 4, fontWeight: '600' },
  timerBadge: { backgroundColor: colors.error + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  timerText: { color: colors.error, fontWeight: '800', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  feedScroll: { flex: 1, backgroundColor: '#fcfcfc' },
  emptyFeed: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyFeedText: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 40 },

  feedItem: { 
    backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity:0.05, shadowRadius:2,
    borderLeftWidth: 3, borderLeftColor: colors.primaryGreen
  },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  itemTime: { ...typography.captionText, color: colors.textSecondary, marginLeft: 8, fontSize: 11 },
  itemBody: { paddingLeft: 32 },
  itemSummary: { ...typography.bodyText, fontSize: 14, lineHeight: 20 },

  communityFab: { 
    position: 'absolute', bottom: 130, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentBlue,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, elevation: 4
  },
  communityFabText: { color: '#fff', fontWeight: '700', marginLeft: 8 },

  actionBar: { 
    position: 'absolute', bottom: 0, width: '100%', height: 110,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20
  },
  actionIconCell: { alignItems: 'center' },
  actionIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  actionIconLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  footerBtn: { position: 'absolute', bottom: 95, width: width-40, alignSelf: 'center', height: 48 },

  recordingOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 
  },
  recordingPulse: { 
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.error + '20', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 16 
  },
  recordingPulseInner: { 
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.error 
  },
  recordingOverlayText: { ...typography.bodyText, color: colors.error, fontWeight: '700', marginTop: 10 },
  stopRecordingBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error, 
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, marginTop: 24, gap: 8
  },
  stopRecordingBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  noteModal: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { ...typography.headingSmall, marginBottom: 12 },
  noteInput: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, height: 120, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  modalCancel: { padding: 10 },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalAdd: { backgroundColor: colors.primaryGreen, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  modalAddText: { color: '#fff', fontWeight: '700' },

  // Step 4
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee' },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, gap: 10 },
  methodCard: { 
    flex: 1, height: 80, backgroundColor: colors.primaryGreen + '10', 
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 
  },
  methodLabel: { fontSize: 11, fontWeight: '600', color: colors.primaryGreen },

  capturePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  previewBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySaffron + '15', 
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 
  },
  previewBadgeText: { fontSize: 11, color: colors.primarySaffron, fontWeight: '700' },
  previewImageSmall: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eee' },
  
  miniRecordingOverlay: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error + '10', 
    padding: 10, borderRadius: 12, marginTop: 10, justifyContent: 'center', gap: 10
  },
  recordingIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error + '30', justifyContent: 'center', alignItems: 'center' },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error },

  // Step 5 — Premium Report
  reportHero: {
    backgroundColor: colors.primaryGreen, paddingTop: 30, paddingBottom: 20,
    paddingHorizontal: 20, alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroCheckmark: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  heroMeta: { flexDirection: 'row', gap: 16, marginTop: 12 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, marginTop: 16, paddingVertical: 12, paddingHorizontal: 8,
    width: '100%',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  reportCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.primaryGreen, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  cardBody: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, flex: 1 },

  evCard: {
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: colors.accentBlue,
  },
  evHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  evIconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  evLabel: { fontWeight: '700', fontSize: 13, color: colors.textPrimary },
  evType: { fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  evViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentBlue + '10',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  evViewText: { fontSize: 11, color: colors.accentBlue, fontWeight: '700' },
  evBullet: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, paddingLeft: 40, marginBottom: 3 },

  findingCat: { fontWeight: '700', fontSize: 13, color: colors.textPrimary },
  findingTxt: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },

  needItem: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, marginBottom: 8 },
  needTitle: { fontWeight: '700', fontSize: 13, flex: 1 },
  needDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevText: { fontSize: 10, fontWeight: '800' },

  cvCard: { backgroundColor: '#f9f0ff', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#9C27B0' },
  cvBadge: { fontSize: 9, color: colors.textSecondary, backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  cvQuote: { fontSize: 12, color: '#9C27B0', fontStyle: 'italic', marginTop: 4 },

  repActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', padding: 14, borderRadius: 12, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  repActionText: { color: colors.primaryGreen, fontWeight: '700', fontSize: 14 },

  // Bullet point styles for summary & conclusion
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  bulletDotGreen: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryGreen, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary },

  // Pause Session
  pausedOverlay: {
    position: 'absolute', bottom: 110, left: 0, right: 0, zIndex: 500,
    alignItems: 'center', paddingHorizontal: 20,
  },
  pausedBadge: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%',
    alignItems: 'center', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    borderWidth: 1, borderColor: colors.primarySaffron + '30',
  },
  pausedTitle: { fontSize: 16, fontWeight: '800', color: colors.primarySaffron, marginTop: 8 },
  pausedSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  resumeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryGreen, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 25, marginTop: 16,
  },
  resumeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
