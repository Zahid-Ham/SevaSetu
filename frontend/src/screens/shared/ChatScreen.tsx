import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator, 
  Modal,
  ScrollView,
  Alert,
  Keyboard,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Audio, Video, ResizeMode } from 'expo-av';
import { audioService } from '../../services/chat/AudioRecordingService';
import Markdown from 'react-native-markdown-display';
import { useChatStore } from '../../services/store/useChatStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useEventStore } from '../../services/store/useEventStore';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { UserAvatar, IconButton, GradientBackground } from '../../components';
import { uploadToCloudinary, uploadPdfViaBackend, formatFileSize } from '../../services/api/uploadToCloudinary';
import { API_BASE_URL } from '../../config/apiConfig';

// ── Components ────────────────────────────────────────────────────────────────

// ── Components ────────────────────────────────────────────────────────────────

const ContextCard = ({ message, isSelf, role }: { message: any; isSelf: boolean; role: string }) => {
  const data = message.metadata || {};
  const isSupervisor = role === 'SUPERVISOR';
  
  return (
    <View style={styles.richContextCard}>
      <LinearGradient 
        colors={isSelf ? ['#1B5E20', '#2E7D32'] : ['#FFFFFF', '#F8F9FA']} 
        style={styles.contextGradient}
      >
        <View style={styles.contextHeader}>
          <View style={[styles.contextIconBg, { backgroundColor: isSelf ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <Feather name="target" size={18} color={isSelf ? '#fff' : colors.primaryGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contextTitle, { color: isSelf ? '#fff' : colors.textPrimary }]}>
              Mission Context Attached
            </Text>
            <Text style={[styles.contextLabel, { color: isSelf ? 'rgba(255,255,255,0.8)' : colors.primaryGreen, fontWeight: '700' }]}>
              {data.event_name || 'Active Mission'}
            </Text>
          </View>
        </View>

        <View style={[styles.contextDivider, { backgroundColor: isSelf ? 'rgba(255,255,255,0.15)' : '#EEE' }]} />

        <View style={styles.contextBody}>
          <Text style={[styles.contextDesc, { color: isSelf ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]} numberOfLines={3}>
            {data.event_description || 'No detailed description provided for this mission context.'}
          </Text>

          <View style={styles.contextInfoRow}>
            <View style={styles.contextStat}>
              <Text style={[styles.contextStatVal, { color: isSelf ? '#fff' : colors.primaryGreen }]}>
                {data.match_score || '85'}%
              </Text>
              <Text style={[styles.contextStatLabel, { color: isSelf ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Match</Text>
            </View>
            <View style={[styles.contextStat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: isSelf ? 'rgba(255,255,255,0.1)' : '#EEE', paddingHorizontal: 15 }]}>
              <Text style={[styles.contextStatVal, { color: isSelf ? '#fff' : colors.primaryGreen }]}>
                {data.area || 'Zone A'}
              </Text>
              <Text style={[styles.contextStatLabel, { color: isSelf ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Area</Text>
            </View>
            <View style={styles.contextStat}>
              <Text style={[styles.contextStatVal, { color: isSelf ? '#fff' : colors.primaryGreen }]}>
                {Array.isArray(data.skills) ? data.skills.length : 2}
              </Text>
              <Text style={[styles.contextStatLabel, { color: isSelf ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Skills</Text>
            </View>
          </View>

          <View style={styles.skillsTagRow}>
            {(data.skills || ['First Aid', 'Logistics']).map((s: string) => (
              <View key={s} style={[styles.miniSkillTag, { backgroundColor: isSelf ? 'rgba(255,255,255,0.15)' : 'rgba(16, 185, 129, 0.08)' }]}>
                <Text style={[styles.miniSkillText, { color: isSelf ? '#fff' : colors.primaryGreen }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const ImageBubble = ({ 
  message, 
  isSelf, 
  onLongPress,
  onPress 
}: { 
  message: any; 
  isSelf: boolean; 
  onLongPress?: (m: any) => void;
  onPress?: (url: string) => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onLongPress={() => onLongPress?.(message)}
    onPress={() => onPress?.(message.file_url)}
    style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper]}
  >
    <Image
      source={{ uri: message.file_url }}
      style={styles.imageBubble}
      resizeMode="cover"
    />
    <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isSelf ? 'flex-end' : 'flex-start', marginTop: 2 }]}>
      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Text>
  </TouchableOpacity>
);

// ── PDF/Document Bubble ───────────────────────────────────────────────────────

const PdfBubble = ({ 
  message, 
  isSelf, 
  onLongPress,
  onOpenPdf 
}: { 
  message: any; 
  isSelf: boolean; 
  onLongPress?: (m: any) => void;
  onOpenPdf?: (m: any) => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onLongPress={() => onLongPress?.(message)}
    onPress={() => onOpenPdf ? onOpenPdf(message) : (message.file_url && Linking.openURL(message.file_url))}
    style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper]}
  >
    <View style={[styles.pdfBubble, isSelf ? styles.pdfBubbleSelf : styles.pdfBubbleOther]}>
      {isSelf && <LinearGradient colors={['#1B5E20', '#2E7D32']} style={StyleSheet.absoluteFill} />}
      <View style={styles.pdfIcon}>
        <Feather name="file-text" size={24} color={isSelf ? '#fff' : colors.primaryGreen} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.pdfName, { color: isSelf ? '#fff' : colors.textPrimary }]} numberOfLines={1}>
          {message.file_name || 'Document'}
        </Text>
        <Text style={[styles.pdfSize, { color: isSelf ? '#A5D6A7' : colors.textSecondary }]}>
          {message.file_size ? formatFileSize(message.file_size) : 'PDF'} • Tap to open
        </Text>
      </View>
      <Feather name="external-link" size={16} color={isSelf ? '#A5D6A7' : colors.primaryGreen} />
    </View>
    <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isSelf ? 'flex-end' : 'flex-start', marginTop: 2 }]}>
      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Text>
  </TouchableOpacity>
);

// ── Audio Bubble ─────────────────────────────────────────────────────────────

const AudioBubble = ({ 
  message, 
  isSelf, 
  onLongPress 
}: { 
  message: any; 
  isSelf: boolean; 
  onLongPress?: (m: any) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const togglePlayback = async () => {
    try {
      if (soundRef.current && isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } else {
        // Use proxy URL to bypass 401
        const params = new URLSearchParams({ public_id: message.file_public_id || '' });
        const proxyUrl = `${API_BASE_URL}/chat/serve-file?${params.toString()}`;
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: proxyUrl },
          { shouldPlay: true, isLooping: false }, // Explicitly disable looping
          (status) => setPlaybackStatus(status)
        );
        soundRef.current = sound;
        setIsPlaying(true);
        
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            sound.setPositionAsync(0);
            sound.pauseAsync(); // Extra safety
          }
          setPlaybackStatus(status);
        });
      }
    } catch (err) {
      console.error('Audio playback error', err);
    }
  };

  const getProgress = () => {
    if (!playbackStatus || !playbackStatus.durationMillis) return 0;
    return playbackStatus.positionMillis / playbackStatus.durationMillis;
  };

  const durationStr = message.metadata?.duration 
    ? `${Math.floor(message.metadata.duration / 1000 / 60)}:${String(Math.floor((message.metadata.duration / 1000) % 60)).padStart(2, '0')}`
    : '0:00';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={() => onLongPress?.(message)}
      style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper]}
    >
      <View style={[styles.audioBubble, isSelf ? styles.audioBubbleSelf : styles.audioBubbleOther]}>
        {isSelf && <LinearGradient colors={['#1B5E20', '#2E7D32']} style={StyleSheet.absoluteFill} />}
        <TouchableOpacity style={styles.playBtn} onPress={togglePlayback}>
          <Feather name={isPlaying ? 'pause' : 'play'} size={24} color={isSelf ? '#fff' : colors.primaryGreen} />
        </TouchableOpacity>
        
        <View style={styles.audioContent}>
          <View style={styles.waveformContainer}>
             {/* Simple waveform representation */}
             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
               <View 
                 key={i} 
                 style={[
                   styles.waveformBar, 
                   { 
                     height: 10 + Math.random() * 20,
                     backgroundColor: i / 15 <= getProgress() 
                       ? (isSelf ? '#fff' : colors.primaryGreen)
                       : (isSelf ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)')
                   }
                 ]} 
               />
             ))}
          </View>
          <Text style={[styles.audioDuration, { color: isSelf ? '#A5D6A7' : colors.textSecondary }]}>
            {isPlaying && playbackStatus ? 
              `${Math.floor(playbackStatus.positionMillis / 1000 / 60)}:${String(Math.floor((playbackStatus.positionMillis / 1000) % 60)).padStart(2, '0')}` 
              : durationStr}
          </Text>
        </View>
      </View>
      <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isSelf ? 'flex-end' : 'flex-start', marginTop: 2 }]}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );
};

// ── Video Bubble ─────────────────────────────────────────────────────────────

const VideoBubble = ({ 
  message, 
  isSelf, 
  onLongPress 
}: { 
  message: any; 
  isSelf: boolean; 
  onLongPress?: (m: any) => void;
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const videoRef = useRef<any>(null);
  
  // Fetch thumbnail (first frame) via proxy with transformation
  const thumbParams = new URLSearchParams({ 
    public_id: message.file_public_id || '',
    transformation: 'so_0', // First frame
    extension: 'jpg'        // Convert video to image
  });
  const thumbUrl = `${API_BASE_URL}/chat/serve-file?${thumbParams.toString()}`;

  // Video URL via proxy for streaming
  const videoParams = new URLSearchParams({ public_id: message.file_public_id || '' });
  const videoUrl = `${API_BASE_URL}/chat/serve-file?${videoParams.toString()}`;
  
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={() => onLongPress?.(message)}
      onPress={() => setShowPlayer(true)}
      style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper]}
    >
      <View style={styles.videoThumbnailContainer}>
        <Image
          source={{ uri: thumbUrl }} 
          style={styles.imageBubble}
          resizeMode="cover"
        />
        <View style={styles.videoOverlay}>
          <View style={styles.playIconCircle}>
            <Feather name="play" size={24} color="#fff" />
          </View>
        </View>
      </View>

      <Modal visible={showPlayer} transparent={false} animationType="fade">
        <View style={styles.fullScreenPlayer}>
          <TouchableOpacity style={styles.closePlayer} onPress={() => setShowPlayer(false)}>
            <View style={styles.closeIconBg}>
              <Feather name="x" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <Video
            ref={videoRef}
            style={styles.fullVideo}
            source={{ uri: videoUrl }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            shouldPlay={true}
            onError={(err) => {
              console.error('[VideoPlayer] Error:', err);
              Alert.alert('Playback Error', 'Could download or play this video.');
            }}
          />
        </View>
      </Modal>

      <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isSelf ? 'flex-end' : 'flex-start', marginTop: 2 }]}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );
};

const MessageBubble = React.memo(({ 
  message, 
  isSelf, 
  role, 
  onLongPress,
  onOpenPdf,
  onPressImage
}: { 
  message: any; 
  isSelf: boolean; 
  role: string;
  onLongPress?: (msg: any) => void;
  onOpenPdf?: (msg: any) => void;
  onPressImage?: (url: string) => void;
}) => {
  const isAttachment = message.type === 'event_attachment';
  const isDeleted = message.deleted;

  if (isAttachment) {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onLongPress={() => onLongPress?.(message)}
        style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper, { maxWidth: '90%' }]}
      >
        <ContextCard message={message} isSelf={isSelf} role={role} />
        <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isSelf ? 'flex-end' : 'flex-start', marginTop: 2 }]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Media Bubbles ──
  if (message.type === 'image' && message.file_url && !isDeleted) {
    return <ImageBubble message={message} isSelf={isSelf} onLongPress={onLongPress} onPress={onPressImage} />;
  }
  if (message.type === 'pdf' && message.file_url && !isDeleted) {
    return <PdfBubble message={message} isSelf={isSelf} onLongPress={onLongPress} onOpenPdf={onOpenPdf} />;
  }
  if (message.type === 'audio' && message.file_url && !isDeleted) {
    return <AudioBubble message={message} isSelf={isSelf} onLongPress={onLongPress} />;
  }
  if (message.type === 'video' && message.file_url && !isDeleted) {
    return <VideoBubble message={message} isSelf={isSelf} onLongPress={onLongPress} />;
  }

  return (
    <View style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper]}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onLongPress={() => onLongPress?.(message)}
        style={[
          styles.bubble,
          isSelf ? styles.selfBubble : styles.otherBubble,
          isDeleted && { backgroundColor: isSelf ? '#E0E0E0' : '#F5F5F5', borderWidth: 1, borderColor: '#DDD' }
        ]}
      >
        {isSelf && !isDeleted ? (
          <LinearGradient colors={['#1B5E20', '#2E7D32']} style={StyleSheet.absoluteFill} />
        ) : null}
        
        <Text style={[
          styles.messageText, 
          { color: isDeleted ? colors.textSecondary : (isSelf ? '#fff' : colors.textPrimary) },
          isDeleted && { fontStyle: 'italic', fontSize: 13 }
        ]}>
          {isDeleted ? 'This message was deleted' : message.text}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timestamp, { color: isDeleted ? colors.textSecondary : (isSelf ? '#A5D6A7' : colors.textSecondary) }]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Main Screen ───────────────────────────────────────────────────────────────

// ── Markdown Styles ──────────────────────────────────────────────────────────
const markdownStyles = {
  body: {
    color: '#333',
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: { fontSize: 22, fontWeight: 'bold' as 'bold', color: '#00796B' },
  heading2: { fontSize: 18, fontWeight: 'bold' as 'bold', color: '#00796B', marginTop: 12 },
  strong: { fontWeight: 'bold' as 'bold', color: '#000' },
  bullet_list: { marginVertical: 10 },
  list_item: { marginVertical: 4 },
};

const aiMarkdownStyles = {
  body: {
    color: '#1A237E',
    fontSize: 15,
    lineHeight: 22,
  },
  strong: { fontWeight: 'bold' as 'bold', color: '#1A237E' },
};

const analysisMarkdownStyles = {
  body: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  strong: { fontWeight: 'bold' as 'bold', color: '#1E293B' },
};

export const ChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { 
    volunteer_id, 
    supervisor_id, 
    event_id, 
    recipient_name = 'User',
    event_name = 'General Inquiry'
  } = route.params || {};


  const { role } = useAuthStore();
  const { volunteerId: currentVolunteerId, volunteerProfile } = useEventStore();
  
  // Deterministic current user ID based on role
  const currentUserId = role === 'SUPERVISOR' ? 'sup_deepak_1' : currentVolunteerId;
  const isSupervisor = role === 'SUPERVISOR';
  const myName = isSupervisor ? 'Deepak Supervisor' : (volunteerProfile?.name || 'Volunteer');

  const { 
    messages, 
    loadMessages, 
    loadingMessages,
    sendMessage,
    resetChat,
    generateSummary,
    summary,
    loadingSummary,
    markRoomRead,
    deleteMessage,
    aiHistory,
    loadingAskAi,
    loadingAiHistory,
    askAi,
    clearAiHistory,
    analysis,
    loadingAnalysis,
    analyzeChat,
    connectWebSocket,
    disconnectWebSocket
  } = useChatStore();

  useEffect(() => {
    if (analysis) {
      console.log("[ChatScreen] Deep Analysis Data Received:", analysis);
    }
  }, [analysis]);

  const [inputText, setInputText] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showIntelligenceMenu, setShowIntelligenceMenu] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showAskAi, setShowAskAi] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  // ⚠️ CRITICAL: Sort participant IDs to match the backend's get_room_id() which uses sorted()
  const sortedParticipants = [volunteer_id, supervisor_id].filter(Boolean).sort();
  const roomId = event_id
    ? `${sortedParticipants.join('_')}_${event_id}`
    : sortedParticipants.join('_');

  useEffect(() => {
    if (!roomId || !currentUserId) return;
    
    // 1. Initial load (cached + deltas)
    loadMessages(roomId, currentUserId);
    markRoomRead(roomId, currentUserId).catch(() => {});

    // 2. Connect Real-time listener (global socket)
    connectWebSocket(currentUserId);
  }, [roomId, currentUserId]);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<any>(null);

  const startAudioRecording = async () => {
    try {
      await audioService.startRecording();
      setIsRecording(true);
      setRecordingTime(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopAudioRecording = async () => {
    if (!isRecording) return;
    
    clearInterval(recordingInterval.current);
    setIsRecording(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const result = await audioService.stopRecording();
    if (result) {
      handleMediaUpload(result.uri, 'audio/x-m4a', `audio_${Date.now()}.m4a`, 'audio', { duration: result.duration });
    }
  };

  const handleMediaUpload = async (fileUri: string, fileType: string, fileName: string, msgType: 'image' | 'pdf' | 'audio' | 'video', metadata: any = {}) => {
    setUploading(true);
    setUploadProgress('Processing...');
    
    try {
      let uploaded;
      if (msgType === 'pdf') {
        uploaded = await uploadPdfViaBackend(fileUri, fileName, fileType, API_BASE_URL);
      } else {
        // Audio/Video/Image
        uploaded = await uploadToCloudinary(fileUri, fileType, fileName);
      }

      await sendMessage({
        volunteer_id,
        supervisor_id,
        event_id,
        sender_id: currentUserId,
        text: '',
        volunteer_name: isSupervisor ? recipient_name : myName,
        supervisor_name: isSupervisor ? myName : recipient_name,
        event_name: event_name,
        type: msgType,
        file_url: uploaded.url,
        file_type: fileType,
        file_name: fileName,
        file_size: uploaded.bytes,
        file_public_id: uploaded.publicId,
        metadata
      });
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage({
      volunteer_id,
      supervisor_id,
      event_id,
      sender_id: currentUserId,
      text: inputText.trim(),
      volunteer_name: isSupervisor ? recipient_name : myName,
      supervisor_name: isSupervisor ? myName : recipient_name,
      event_name: event_name,
    });
    setInputText('');
  };

  const handleDownloadReport = async () => {
    setShowIntelligenceMenu(false);
    setUploadProgress('Preparing PDF...');
    setUploading(true);
    
    try {
      const fileName = `SevaSetu_Report_${roomId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const downloadUrl = `${API_BASE_URL}/chat/report/${roomId}?event_name=${encodeURIComponent(event_name)}`;
      
      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert('Report Ready', 'Download complete. You can find it at ' + downloadRes.uri);
        }
      } else {
        throw new Error('Server returned ' + downloadRes.status);
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleAskAi = () => {
    if (!aiQuestion.trim()) return;
    askAi(roomId, aiQuestion.trim(), currentUserId, event_name);
    setAiQuestion('');
  };

  const handleAttachMedia = async (mediaType: 'image' | 'camera' | 'document' | 'video') => {
    setShowMediaPicker(false);
    
    try {
      let fileUri = '';
      let fileType = '';
      let fileName = '';
      let msgType: 'image' | 'pdf' | 'video' = 'image';

      if (mediaType === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileType = asset.mimeType || 'image/jpeg';
        fileName = asset.fileName || `image_${Date.now()}.jpg`;
        msgType = 'image';
      } else if (mediaType === 'video') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileType = asset.mimeType || 'video/mp4';
        fileName = asset.fileName || `video_${Date.now()}.mp4`;
        msgType = 'video';
      } else if (mediaType === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        fileName = asset.fileName || `${asset.type === 'video' ? 'video' : 'photo'}_${Date.now()}`;
        msgType = asset.type === 'video' ? 'video' : 'image';
      } else if (mediaType === 'document') {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileType = asset.mimeType || 'application/pdf';
        fileName = asset.name || `document_${Date.now()}.pdf`;
        msgType = 'pdf';
      }

      await handleMediaUpload(fileUri, fileType, fileName, msgType);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    }
  };

  const handleAttachContext = () => {
    // Prevent multiple attachments if the last message was already a context card
    const hasLastContext = messages.length > 0 && messages[messages.length-1].type === 'event_attachment';
    if (hasLastContext) return;

    sendMessage({
      volunteer_id,
      supervisor_id,
      event_id,
      sender_id: currentUserId,
      text: `Mission Context: ${event_name}`,
      type: 'event_attachment',
      volunteer_name: isSupervisor ? recipient_name : myName,
      supervisor_name: isSupervisor ? myName : recipient_name,
      event_name: event_name,
      metadata: route.params.metadata || {
        event_name,
        event_description: 'Mission details related to ' + event_name,
        match_score: 85,
        area: 'Nagpur',
        skills: ['First Aid', 'Logistics']
      }
    });
  };

  const handleLongPress = (msg: any) => {
    if (msg.deleted) return;
    
    const isMyMsg = msg.sender_id === currentUserId;
    
    const options = [
      {
        text: 'Delete for Me',
        onPress: () => deleteMessage(roomId, msg.id, 'for_me', currentUserId),
        style: 'destructive' as 'destructive'
      }
    ];

    if (isMyMsg) {
      options.unshift({
        text: 'Delete for Everyone',
        onPress: () => deleteMessage(roomId, msg.id, 'for_everyone', currentUserId),
        style: 'destructive' as 'destructive'
      });
    }

    Alert.alert(
      'Delete Message?',
      'Are you sure you want to delete this message?',
      [
        ...options,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleOpenPdf = async (msg: any) => {
    if (!msg.file_url && !msg.file_public_id) return;
    
    // Use our backend proxy to fetch and stream the file.
    // This is the ONLY approach that works on "untrusted" Cloudinary accounts
    // where CDN delivery (and even signed URLs) are blocked at the account level.
    if (msg.file_public_id) {
      const params = new URLSearchParams({ public_id: msg.file_public_id });
      const proxyUrl = `${API_BASE_URL}/chat/serve-file?${params.toString()}`;
      console.log('[ChatScreen] Opening via backend proxy:', proxyUrl);
      Linking.openURL(proxyUrl);
    } else {
      // Fallback for old messages without public_id
      Linking.openURL(msg.file_url);
    }
  };

  const showContextSuggestion = event_id && messages.length < 5 && !messages.some(m => m.type === 'event_attachment');

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerInfo} 
            onPress={() => setShowProfile(true)}
          >
            <UserAvatar name={recipient_name} size={42} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>{recipient_name}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {event_name || 'General Inquiry'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.intelligenceBtn}
            onPress={() => setShowIntelligenceMenu(true)}
          >
            <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.intelIcon}>
              <Feather name="zap" size={18} color={colors.primaryGreen} />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowProfile(true)}>
            <Feather name="info" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble 
              message={item} 
              isSelf={item.sender_id === currentUserId} 
              role={role!} 
              onLongPress={handleLongPress}
              onOpenPdf={handleOpenPdf}
              onPressImage={(url) => setSelectedImageUrl(url)}
            />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Feather name="message-circle" size={48} color={colors.textSecondary + '50'} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Say hello to start the conversation!</Text>
            </View>
          }
        />
      )}

      {showContextSuggestion && (
        <TouchableOpacity style={styles.suggestionBar} onPress={handleAttachContext}>
          <LinearGradient colors={['#E8F5E9', '#F1F8E9']} style={styles.suggestionGradient}>
            <Feather name="info" size={16} color={colors.primaryGreen} />
            <Text style={styles.suggestionText}>Tap to share Mission details as context</Text>
            <Feather name="chevron-right" size={16} color={colors.primaryGreen} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={[
        styles.inputArea, 
        { paddingBottom: isKeyboardVisible ? spacing.sm : Math.max(insets.bottom, spacing.sm) }
      ]}>
        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={colors.primaryGreen} />
            <Text style={styles.uploadingText}>{uploadProgress}</Text>
          </View>
        )}
        <View style={styles.inputContainer}>
          {isRecording ? (
            <View style={styles.recordingOverlay}>
              <View style={styles.recordIndicator} />
              <Text style={styles.recordingTimer}>
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </Text>
              <View style={styles.liveWaveform}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                  <View key={i} style={[styles.waveformBar, { height: 10 + Math.random() * 20, backgroundColor: colors.primaryGreen }]} />
                ))}
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Release to send</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.attachBtn} onPress={() => setShowMediaPicker(true)}>
                <Feather name="paperclip" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            </>
          )}

          {!inputText.trim() ? (
            <TouchableOpacity 
              style={styles.sendBtn} 
              onPressIn={startAudioRecording}
              onPressOut={stopAudioRecording}
            >
              <LinearGradient colors={isRecording ? ['#FF5252', '#D32F2F'] : ['#10B981', '#059669']} style={styles.sendGradient}>
                <Feather name={isRecording ? 'mic' : 'mic'} size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.sendBtn} 
              onPress={handleSend}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.sendGradient}>
                <Feather name="send" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Media Picker Action Sheet */}
      <Modal visible={showMediaPicker} transparent animationType="slide" onRequestClose={() => setShowMediaPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMediaPicker(false)}>
          <View style={styles.mediaPickerSheet}>
            <View style={styles.mediaPickerHandle} />
            <Text style={styles.mediaPickerTitle}>Share File</Text>
            <TouchableOpacity style={styles.mediaPickerOption} onPress={() => handleAttachMedia('image')}>
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="image" size={22} color="#1565C0" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>Photo from Gallery</Text>
                <Text style={styles.mediaPickerDesc}>Share an image from your photos</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaPickerOption} onPress={() => handleAttachMedia('camera')}>
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#E8F5E9' }]}>
                <Feather name="camera" size={22} color="#2E7D32" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>Take a Photo</Text>
                <Text style={styles.mediaPickerDesc}>Open camera to capture an image</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaPickerOption} onPress={() => handleAttachMedia('video')}>
              <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.mediaPickerIcon}>
                <Feather name="video" size={24} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={styles.mediaPickerLabel}>Video Gallery</Text>
                <Text style={styles.mediaPickerDesc}>Share a recorded video</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaPickerOption} onPress={() => handleAttachMedia('document')}>
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#FFF3E0' }]}>
                <Feather name="file-text" size={22} color="#E65100" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>PDF Document</Text>
                <Text style={styles.mediaPickerDesc}>Share a PDF file</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaPickerCancel} onPress={() => setShowMediaPicker(false)}>
              <Text style={styles.mediaPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI Summary Modal */}
      <Modal visible={!!selectedImageUrl} transparent={false} animationType="fade">
        <View style={styles.fullScreenPlayer}>
          <TouchableOpacity style={styles.closePlayer} onPress={() => setSelectedImageUrl(null)}>
            <View style={styles.closeIconBg}>
              <Feather name="x" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <ScrollView
            maximumZoomScale={5}
            minimumZoomScale={1}
            contentContainerStyle={styles.fullImageContainer}
            centerContent
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {selectedImageUrl && (
              <Image 
                source={{ uri: selectedImageUrl }} 
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.summaryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ Gemini Chat Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(false)} style={styles.modalCloseIcon}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.summaryContent}>
              {loadingSummary ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primaryGreen} size="large" />
                  <Text style={styles.loadingText}>Synthesizing takeaways...</Text>
                </View>
              ) : (
                <Markdown style={markdownStyles}>
                  {summary || 'No actionable takeaways found.'}
                </Markdown>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setShowSummary(false)}>
              <Text style={styles.modalFooterBtnText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Info Modal */}
      <Modal visible={showProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={() => setShowProfile(false)} 
          />
          <View style={styles.profileModal}>
            <View style={styles.profileBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHero}>
                <UserAvatar name={recipient_name} size={90} />
                <Text style={styles.profileName}>{recipient_name}</Text>
                <Text style={styles.profileRole}>
                  {isSupervisor ? 'Active Volunteer' : 'Mission Supervisor'}
                </Text>
              </View>

              <View style={styles.profileStats}>
                <View style={styles.pStat}>
                  <Text style={styles.pStatVal}>4.8</Text>
                  <Text style={styles.pStatLabel}>Rating</Text>
                </View>
                <View style={[styles.pStat, styles.pStatBorder]}>
                  <Text style={styles.pStatVal}>12</Text>
                  <Text style={styles.pStatLabel}>Missions</Text>
                </View>
                <View style={styles.pStat}>
                  <Text style={styles.pStatVal}>High</Text>
                  <Text style={styles.pStatLabel}>Impact</Text>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.sectionPara}>
                  Dedicated {isSupervisor ? 'volunteer' : 'supervisor'} committed to community development. 
                  Experienced in urban relief and emergency response management.
                </Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>Skills & Expertise</Text>
                <View style={styles.profileSkills}>
                  {['Crisis Management', 'First Aid', 'Logistics', 'Public Safety'].map(s => (
                    <View key={s} style={styles.pSkillTag}>
                      <Text style={styles.pSkillText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.profileActionBtn}
                onPress={() => setShowProfile(false)}
              >
                <Text style={styles.profileActionText}>Close Profile</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Intelligence Menu ── */}
      <Modal visible={showIntelligenceMenu} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowIntelligenceMenu(false)}
        >
          <View style={styles.mediaPickerSheet}>
            <View style={styles.mediaPickerHandle} />
            <Text style={styles.mediaPickerTitle}>✨ SevaSetu AI Intelligence</Text>
            
            <TouchableOpacity 
              style={styles.mediaPickerOption} 
              onPress={() => {
                setShowIntelligenceMenu(false);
                generateSummary(roomId, event_name);
                setShowSummary(true);
              }}
            >
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#E0F2F1' }]}>
                <Feather name="list" size={22} color="#00796B" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>Quick Summary</Text>
                <Text style={styles.mediaPickerDesc}>Fast takeaway of current conversation</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaPickerOption} 
              onPress={() => {
                setShowIntelligenceMenu(false);
                analyzeChat(roomId, event_name);
                setShowFullAnalysis(true);
              }}
            >
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#F3E5F5' }]}>
                <Feather name="trending-up" size={22} color="#7B1FA2" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>Deep Chat Analysis</Text>
                <Text style={styles.mediaPickerDesc}>Rich insights, sentiment, & mission alignment</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaPickerOption} 
              onPress={() => {
                setShowIntelligenceMenu(false);
                setShowAskAi(true);
              }}
            >
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="message-square" size={22} color="#1976D2" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>Ask AI About This Chat</Text>
                <Text style={styles.mediaPickerDesc}>Memory-aware Q&A for this conversation</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaPickerOption} 
              onPress={handleDownloadReport}
            >
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#E8F5E9' }]}>
                <Feather name="download" size={22} color="#2E7D32" />
              </View>
              <View>
                <Text style={styles.mediaPickerLabel}>Download Full Report (PDF)</Text>
                <Text style={styles.mediaPickerDesc}>Save professional analysis to your device</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaPickerCancel} onPress={() => setShowIntelligenceMenu(false)}>
              <Text style={styles.mediaPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Ask AI Panel ── */}
      <Modal visible={showAskAi} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setShowAskAi(false)} 
          />
          <View style={styles.askAiSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>🤖</Text>
                <Text style={styles.modalTitle}>Ask SevaSetu AI</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {aiHistory.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      Alert.alert(
                        "Clear AI History?",
                        "This will permanently delete all your previous questions and answers in this specific chat room.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Clear All", style: "destructive", onPress: () => clearAiHistory(roomId) }
                        ]
                      );
                    }}
                    style={{ padding: 4 }}
                  >
                    <Feather name="trash-2" size={19} color="#FF5252" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowAskAi(false)} style={styles.modalCloseIcon}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.askAiContent}>
              <ScrollView 
                style={styles.askAiAnswerArea}
                contentContainerStyle={{ paddingBottom: 20 }}
                ref={ref => {
                  // Auto-scroll to bottom simplified for ScrollView
                  if (ref) setTimeout(() => ref.scrollToEnd({ animated: true }), 100);
                }}
              >
                {aiHistory.length === 0 && !loadingAskAi ? (
                  <View style={styles.emptyAskAi}>
                    <Feather name="cpu" size={40} color="#DDD" />
                    <Text style={styles.emptyAskAiText}>Ask me any specific question about what you discussed in this chat.</Text>
                  </View>
                ) : (
                  <View>
                    {aiHistory.map((item, idx) => (
                      <View key={item.id || idx} style={{ marginBottom: 16 }}>
                        {/* Question Bubble (Right) */}
                        <View style={styles.aiQuestionWrapper}>
                          <View style={styles.aiQuestionBubble}>
                            <Text style={styles.aiQuestionText}>{item.question}</Text>
                          </View>
                        </View>

                        {/* Answer Bubble (Left) */}
                        <View style={styles.aiAnswerWrapper}>
                          <View style={styles.aiAnswerBubble}>
                            <Markdown style={aiMarkdownStyles}>
                              {item.answer}
                            </Markdown>
                            {item.timestamp && (
                              <Text style={styles.aiAnswerTimestamp}>
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                    
                    {loadingAskAi && (
                      <View style={styles.loadingAiInteraction}>
                        <ActivityIndicator color={colors.primaryGreen} size="small" />
                        <Text style={styles.loadingAiText}>Thinking...</Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              <View style={styles.askAiInputRow}>
                <TextInput
                  style={styles.askAiInput}
                  placeholder="e.g. What was the budget we discussed?"
                  value={aiQuestion}
                  onChangeText={setAiQuestion}
                  onSubmitEditing={handleAskAi}
                />
                <TouchableOpacity 
                  style={styles.askAiSendBtn} 
                  onPress={handleAskAi}
                  disabled={useChatStore.getState().loadingAskAi || !aiQuestion.trim()}
                >
                  <Feather name="arrow-up" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Full Analysis Modal ── */}
      <Modal visible={showFullAnalysis} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.summaryModal, { height: '85%', width: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>📊 Deep Chat Analysis</Text>
                <Text style={styles.modalSubtitle}>{event_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFullAnalysis(false)} style={styles.modalCloseIcon}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.summaryContent} 
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {loadingAnalysis ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primaryGreen} size="large" />
                  <Text style={styles.loadingText}>Processing Mission Intelligence...</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                    Gemini is reading documents and images to extract strategic insights.
                  </Text>
                  <Text style={{ fontSize: 10, color: '#ccc', marginTop: 20 }}>
                    DEBUG: roomId={roomId} | loading={String(loadingAnalysis)}
                  </Text>
                </View>
              ) : (analysis && Object.keys(analysis).length > 0) ? (
                <View>
                  <Text style={{ fontSize: 9, color: '#F1F5F9', position: 'absolute', top: -20 }}>
                    DEBUG: RECEIVED_KEYS={Object.keys(analysis).join(',')}
                  </Text>
                  {/* 1. Mission Executive Summary */}
                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisLabel}>MISSION EXECUTIVE SUMMARY</Text>
                    <Markdown style={analysisMarkdownStyles}>
                      {analysis.executive_summary || "No executive summary available."}
                    </Markdown>
                  </View>

                  {/* 2. Visual Insights & Attachments */}
                  {analysis.visual_insights?.length > 0 && (
                    <View style={styles.analysisCard}>
                      <Text style={styles.analysisLabel}>VISUAL INSIGHTS & ATTACHMENTS</Text>
                      {analysis.visual_insights.map((item: any, idx: number) => (
                        <View key={idx} style={{ marginBottom: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name={item.type === 'pdf' ? 'file-text' : 'image'} size={14} color={colors.primaryGreen} />
                            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textPrimary }}>{item.name}</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                            {item.summary}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 3. Volunteer Readiness */}
                  {analysis.volunteer_readiness && (
                    <View style={styles.analysisCard}>
                      <Text style={styles.analysisLabel}>VOLUNTEER READINESS ASSESSMENT</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                        <View style={{
                          backgroundColor: 
                            analysis.volunteer_readiness.status === 'Ready' ? '#E8F5E9' : 
                            analysis.volunteer_readiness.status === 'Not Ready' ? '#FFEBEE' : '#FFF3E0',
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: 
                            analysis.volunteer_readiness.status === 'Ready' ? '#81C784' : 
                            analysis.volunteer_readiness.status === 'Not Ready' ? '#E57373' : '#FFB74D',
                        }}>
                          <Text style={{
                            color: 
                              analysis.volunteer_readiness.status === 'Ready' ? '#2E7D32' : 
                              analysis.volunteer_readiness.status === 'Not Ready' ? '#C62828' : '#EF6C00',
                            fontWeight: '800',
                            fontSize: 12,
                            textTransform: 'uppercase'
                          }}>
                            {analysis.volunteer_readiness.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                        {analysis.volunteer_readiness.reasoning}
                      </Text>
                    </View>
                  )}

                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisLabel}>MISSION OBJECTIVES & TOPICS</Text>
                    <View style={styles.skillsTagRow}>
                      {analysis.issues_discussed?.map((topic: string) => (
                        <View key={topic} style={[styles.miniSkillTag, { backgroundColor: '#F3E5F5' }]}>
                          <Text style={[styles.miniSkillText, { color: '#7B1FA2' }]}>{topic}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisLabel}>CRITICAL THINKING & INSIGHTS</Text>
                    {analysis.key_insights?.map((insight: string, idx: number) => (
                      <View key={idx} style={styles.insightRow}>
                        <View style={styles.insightDot} />
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisLabel}>MISSION ACTION ITEMS</Text>
                    {analysis.action_items?.map((item: string, idx: number) => (
                      <View key={idx} style={styles.actionRow}>
                        <Feather name="square" size={14} color={colors.primaryGreen} />
                        <Text style={styles.actionText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisLabel}>PROFESSIONAL COMMUNICATION METRICS</Text>
                    <View style={styles.metricsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.metricLabel}>Mission Clarity Score</Text>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${(analysis.quality_score || 0) * 10}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.metricVal}>{analysis.quality_score}/10</Text>
                    </View>
                    <Text style={styles.sentimentHint}>
                      Overall Tone: {analysis.sentiment_breakdown?.overall || "N/A"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Feather name="alert-circle" size={40} color="#DDD" />
                  <Text style={styles.emptyText}>No analysis data available.</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                    We couldn't generate a report from current messages. Try sending more mission-related updates.
                  </Text>
                  <TouchableOpacity 
                    style={styles.retryBtn} 
                    onPress={() => analyzeChat(roomId, event_name)}
                  >
                    <Text style={styles.retryBtnText}>Retry Analysis</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalFooterBtn, { backgroundColor: colors.primaryGreen }]} 
              onPress={handleDownloadReport}
            >
              <Feather name="download" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.modalFooterBtnText}>Download PDF Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...typography.headingSmall,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.captionText,
    color: colors.primaryGreen,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryAction: {
    marginRight: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    padding: 4,
  },
  intelligenceBtn: {
    marginRight: 10,
  },
  intelIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  messageList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  bubbleWrapper: {
    marginBottom: spacing.md,
  },
  selfWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '85%',
    position: 'relative',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selfBubble: {
    borderBottomRightRadius: 4,
    backgroundColor: colors.primaryGreen,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    backgroundColor: '#fff',
  },
  messageText: {
    ...typography.bodyText,
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  richContextCard: {
    width: 300,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    marginVertical: 10,
  },
  contextGradient: {
    padding: spacing.lg,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  contextIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  contextLabel: {
    fontSize: 16,
    marginTop: 2,
  },
  contextDivider: {
    height: 1,
    marginVertical: 15,
  },
  contextBody: {
    gap: 15,
  },
  contextDesc: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contextInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 10,
    borderRadius: 12,
  },
  contextStat: {
    alignItems: 'center',
    flex: 1,
  },
  contextStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  contextStatLabel: {
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniSkillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniSkillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionBar: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  inputArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
    borderRadius: 25,
    paddingHorizontal: 6,
  },
  attachBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    margin: 4,
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...typography.headingSmall,
    color: colors.primaryGreen,
  },
  modalCloseIcon: {
    padding: 8,
  },
  summaryContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 14,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  modalFooterBtn: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalFooterBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  profileModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    height: '85%',
    paddingHorizontal: spacing.xl,
  },
  profileBar: {
    width: 50,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 30,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileName: {
    ...typography.headingMedium,
    marginTop: 16,
    color: colors.textPrimary,
  },
  profileRole: {
    color: colors.primaryGreen,
    fontWeight: '700',
    marginTop: 4,
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 30,
  },
  pStat: {
    flex: 1,
    alignItems: 'center',
  },
  pStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
  },
  pStatVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  sectionPara: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  profileSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pSkillTag: {
    backgroundColor: colors.primaryGreen + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pSkillText: {
    color: colors.primaryGreen,
    fontWeight: '700',
    fontSize: 12,
  },
  profileActionBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  profileActionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyChatSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  // ── Image Bubble
  imageBubble: {
    width: 220,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  // ── PDF Bubble
  pdfBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    maxWidth: 260,
  },
  pdfBubbleSelf: {
    backgroundColor: '#1B5E20',
  },
  pdfBubbleOther: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pdfIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pdfName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 160,
  },
  pdfSize: {
    fontSize: 11,
    marginTop: 2,
  },
  // ── Uploading indicator
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.primaryGreen + '15',
    borderRadius: 8,
    marginBottom: 6,
  },
  uploadingText: {
    fontSize: 13,
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  // ── Media Picker Sheet
  mediaPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 36,
  },
  mediaPickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  mediaPickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  mediaPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mediaPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPickerLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mediaPickerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mediaPickerCancel: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
  },
  mediaPickerCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  // ── Audio Bubble
  audioBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 12,
    overflow: 'hidden',
    minWidth: 200,
  },
  audioBubbleSelf: {
    backgroundColor: '#1B5E20',
  },
  audioBubbleOther: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioContent: {
    flex: 1,
    gap: 6,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 30,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioDuration: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Video Bubble
  videoThumbnailContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fullScreenPlayer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closePlayer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullVideo: {
    flex: 1,
    width: '100%',
  },
  closeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  // ── Recording UI
  recordingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    gap: 12,
  },
  recordIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  recordingTimer: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 45,
  },
  liveWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 40,
  },
  // ── Intelligence/AI Styles
  intelligenceSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  askAiSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '75%',
    padding: spacing.lg,
  },
  askAiContent: {
    flex: 1,
  },
  askAiAnswerArea: {
    flex: 1,
    marginVertical: 15,
  },
  aiQuestionWrapper: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  aiQuestionBubble: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  aiQuestionText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '600',
  },
  aiAnswerWrapper: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aiAnswerBubble: {
    backgroundColor: '#F3E5F5', // Light purple for AI
    padding: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: '90%',
  },
  aiAnswerTimestamp: {
    fontSize: 10,
    color: '#7B1FA2',
    marginTop: 8,
    textAlign: 'right',
    opacity: 0.7,
  },
  loadingAiInteraction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  loadingAiText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyAskAi: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
    gap: 15,
    marginTop: 100,
  },
  emptyAskAiText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 40,
  },
  askAiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingRight: 6,
    paddingLeft: 15,
    marginBottom: 10,
  },
  askAiInput: {
    flex: 1,
    height: 50,
    fontSize: 15,
  },
  askAiSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  analysisLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  analysisValue: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7B1FA2',
    marginTop: 7,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryGreen,
  },
  sentimentHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  summaryModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    alignSelf: 'center',
  },
  emptyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  retryBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.primaryGreen,
    fontWeight: '700',
    marginTop: 2,
  },
});
