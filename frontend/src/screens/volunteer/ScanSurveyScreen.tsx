import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'; // Refresh: 2026-04-23 19:40
import {
  View, StyleSheet, Text, Image, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, Animated, Easing, Alert, ActivityIndicator,
  Modal, TouchableWithoutFeedback, Dimensions, Linking
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { AppHeader, PrimaryButton, IconButton, ConfettiOverlay, FullImageViewer, DynamicText } from '../../components';
import { ShimmerCardList } from '../../components/common/SkeletonCard';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';
import { FieldReportScreen } from './FieldReportScreen';
import { useLanguage } from '../../context/LanguageContext';
import { getBilingualText, getBilingualArray, BilingualValue } from '../../utils/bilingualHelpers';
import { useAuthStore } from '../../services/store/useAuthStore';


// ─── Sub-components ────────────────────────────────────────────────────────
const AnimatedWeekRow = React.memo(({ step, weekStart, weekEnd, index }: { step: string; weekStart: number; weekEnd: number; index: number }) => {
  const { t } = useLanguage();
  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1, duration: 600, delay: index * 150, useNativeDriver: true, easing: Easing.out(Easing.cubic)
    }).start();
  }, [animValue]);
  const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [25, 0] });
  const opacity = animValue;
  return (
    <Animated.View style={[styles.weekRow, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.weekBadge, { backgroundColor: '#1976D2' }]}>
        <Text style={styles.weekBadgeText}>{t('volunteer.scan.week')} {weekStart}–{weekEnd}</Text>
      </View>
      <View style={styles.weekContent}>
        <DynamicText style={styles.stepText} text={step} />
      </View>
    </Animated.View>
  );
});

const AnimatedTimelineBtn = React.memo(({ onPress }: { onPress: () => void }) => {
  const { t } = useLanguage();
  const translateX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 8, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(translateX, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();
  }, [translateX]);
  return (
    <TouchableOpacity style={styles.timelineDetailBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1976D215', justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="calendar" size={14} color="#1976D2" />
        </View>
        <Text style={styles.timelineDetailText}>{t('volunteer.scan.timelineDetailBtn')}</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Feather name="chevron-right" size={16} color="#1976D2" />
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── Types ────────────────────────────────────────────────────────────────────
type ParsedData = {
  survey_id?: string;
  citizen_name?: string;
  phone?: string;
  precise_location?: string;
  gps_coordinates?: string;
  demographic_tally?: number;
  executive_summary?: BilingualValue;
  primary_category?: BilingualValue;
  sub_category?: BilingualValue;
  problem_status?: BilingualValue;
  duration_of_problem?: BilingualValue;
  urgency_level?: BilingualValue;
  service_status?: BilingualValue;
  severity_score?: number;
  severity_reason?: BilingualValue;
  population_affected?: number;
  vulnerable_group?: BilingualValue;
  vulnerability_flag?: BilingualValue;
  secondary_impact?: BilingualValue;
  expected_resolution_timeline?: BilingualValue[];
  detailed_resolution_steps?: BilingualValue[];
  follow_up_date?: string;
  status?: string;
  govt_scheme_applicable?: BilingualValue;
  ai_recommended_actions?: BilingualValue;
  previous_complaints_insights?: BilingualValue;
  key_complaints?: BilingualValue[];
  sentiment?: BilingualValue;
  key_quote?: BilingualValue;
  photo_url?: string;
  photo_public_id?: string;
  audio_url?: string;
  audio_public_id?: string;
  media_attachments?: {
    url: string;
    type: string;
    format?: string;
    public_id?: string;
    name?: string;
  }[];
  description?: BilingualValue;
  auto_category?: BilingualValue;
  issue_type?: string;
};

type Report = {
  id: string;
  volunteer_id: string;
  created_at: string;
  citizen_name?: string;
  phone?: string;
  precise_location?: string;
  gps_coordinates?: string;
  executive_summary?: BilingualValue;
  primary_category?: BilingualValue;
  sub_category?: BilingualValue;
  problem_status?: BilingualValue;
  duration_of_problem?: BilingualValue;
  urgency_level?: BilingualValue;
  service_status?: BilingualValue;
  severity_score?: number;
  severity_reason?: BilingualValue;
  population_affected?: number;
  vulnerable_group?: BilingualValue;
  vulnerability_flag?: BilingualValue;
  secondary_impact?: BilingualValue;
  expected_resolution_timeline?: BilingualValue[];
  detailed_resolution_steps?: BilingualValue[];
  follow_up_date?: string;
  status?: string;
  govt_scheme_applicable?: BilingualValue;
  ai_recommended_actions?: BilingualValue;
  previous_complaints_insights?: BilingualValue;
  key_complaints?: BilingualValue[];
  sentiment?: BilingualValue;
  key_quote?: BilingualValue;
  description?: BilingualValue;
  auto_category?: BilingualValue;
  report_source?: string;
  location?: string;
  issue_type?: string;
  photo_url?: string;
  photo_public_id?: string;
  audio_url?: string;
  audio_public_id?: string;
  media_attachments?: {
    url: string;
    type: string;
    format?: string;
    public_id?: string;
    name?: string;
  }[];
  field_report_data?: string;
};

type ScreenMode = 'idle' | 'processing' | 'preview' | 'success';

const CATEGORIES = ['All', 'Water', 'Sanitation', 'Infrastructure', 'Health', 'Education', 'Safety', 'Other'];

const ISSUE_COLORS: Record<string, string> = {
  'Water': '#1976D2',
  'Electricity': '#F9A825',
  'Road': '#795548',
  'Sanitation': '#388E3C',
  'Health': '#E53935',
  'Infrastructure': '#8E24AA',
  'Education': '#F57C00',
  'Safety': '#D32F2F',
};
const issueColor = (type?: string) => type ? (ISSUE_COLORS[type] || ISSUE_COLORS[type.split(' ')[0]] || colors.primarySaffron) : colors.primarySaffron;

const formatDate = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};


// ─── Helpers ──────────────────────────────────────────────────────────────────
const getUrgencyConfig = (level?: string) => {
  const l = (level || '').toLowerCase();
  if (l.includes('critical') || l.includes('high') || l.includes('extreme'))
    return { color: '#E53935', bg: '#FFEBEE', label: level || 'Critical', key: 'urgent', pulse: true };
  if (l.includes('medium') || l.includes('moderate'))
    return { color: '#F57C00', bg: '#FFF3E0', label: level || 'Moderate', key: 'medium', pulse: false };
  return { color: '#388E3C', bg: '#E8F5E9', label: level || 'Low', key: 'low', pulse: false };
};

const getSeverityConfig = (score?: number) => {
  if (!score) return { color: '#9E9E9E', label: 'N/A', key: '' };
  if (score >= 8) return { color: '#E53935', label: 'Critical', key: 'urgent' };
  if (score >= 6) return { color: '#F57C00', label: 'High', key: 'urgent' };
  if (score >= 4) return { color: '#FBC02D', label: 'Moderate', key: 'medium' };
  return { color: '#388E3C', label: 'Low', key: 'low' };
};

// ─── Components ──────────────────────────────────────────────────────────────

// Pulsing urgency badge
const UrgencyBadge = ({ level }: { level?: string }) => {
  const { t } = useLanguage();
  const cfg = getUrgencyConfig(level);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (cfg.pulse) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
  }, [cfg.pulse]);
  return (
    <Animated.View style={[
      styles.urgencyBadge,
      { backgroundColor: cfg.bg, borderColor: cfg.color + '80', transform: [{ scale: pulseAnim }] }
    ]}>
      <View style={[styles.urgencyDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.urgencyBadgeText, { color: cfg.color }]}>
        {(cfg.key && t(`supervisor.crisisHeatmap.${cfg.key}`) !== `supervisor.crisisHeatmap.${cfg.key}`) ? t(`supervisor.crisisHeatmap.${cfg.key}`) : cfg.label}
      </Text>
    </Animated.View>
  );
};

// Severity score gauge bar
const SeverityGauge = ({ score, onInfoPress }: { score?: number; onInfoPress: () => void }) => {
  const { t } = useLanguage();
  const cfg = getSeverityConfig(score);
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: score ? score / 10 : 0,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);
  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.gaugeCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.gaugeScore}>{score !== undefined ? score : '—'}</Text>
          <Text style={styles.gaugeTotal}>/10</Text>
          <View style={[styles.gaugeLabelBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' }]}>
            <Text style={[styles.gaugeLabelText, { color: cfg.color }]}>
              {cfg.key && t(`supervisor.crisisHeatmap.${cfg.key}`) !== `supervisor.crisisHeatmap.${cfg.key}` ? t(`supervisor.crisisHeatmap.${cfg.key}`) : cfg.label}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onInfoPress} style={[styles.infoBadge, { backgroundColor: '#E5393515', borderColor: '#E5393540' }]}>
          <Text style={[styles.infoBadgeText, { color: '#E53935' }]}>i</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.gaugeTrack}>
        <Animated.View style={[styles.gaugeFill, { width: barWidth, backgroundColor: cfg.color }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={styles.gaugeCaption}>0</Text>
        <Text style={styles.gaugeCaption}>Severity Score</Text>
        <Text style={styles.gaugeCaption}>10</Text>
      </View>
    </View>
  );
};

const SectionHeader = ({ number, title, icon, accent = colors.primaryGreen }: { number: string; title: string; icon: string; accent?: string }) => {
  const { t } = useLanguage();
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: accent }]}>
      <View style={[styles.sectionHeaderIcon, { backgroundColor: accent + '18' }]}>
        <Feather name={icon as any} size={14} color={accent} />
      </View>
      <Text style={[styles.sectionHeaderText, { color: accent }]}>{number ? `${number}. ` : ''}{t(`volunteer.scan.${title}`) !== `volunteer.scan.${title}` ? t(`volunteer.scan.${title}`).toUpperCase() : title.toUpperCase()}</Text>
    </View>
  );
};

const DetailRow = ({ icon, label, value, color = colors.primaryGreen, collection, docId, field }: { icon: string; label: string; value: string | null | undefined; color?: string; collection?: string; docId?: string; field?: string }) => {
  const { t } = useLanguage();
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: color + '15' }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <DynamicText 
          style={styles.detailValue} 
          text={value || t('common.n/a')} 
          collection={collection}
          docId={docId}
          field={field}
        />
      </View>
    </View>
  );
};

const DetailBulletList = ({ text, accent = colors.primaryGreen }: { text?: string; accent?: string }) => {
  if (!text) return <Text style={styles.detailValue}>—</Text>;

  // Split by newlines or typical list delimiters
  const rawPoints = text.split(/\n|•|\s\-\s|\d\.\s/);
  // Remove leading symbols and empty lines
  const points = rawPoints.map(p => p.replace(/^[-*•]\s*/, '').trim()).filter(p => p.length > 0);

  if (points.length <= 1) return <Text style={styles.detailValue}>{text}</Text>;

  let currentContext = '';

  return (
    <View style={{ marginTop: 4 }}>
      {points.map((rawPoint, i) => {
        let point = rawPoint;

        // Check if this point acts as a sub-header (ends with colon)
        if (point.endsWith(':')) {
          currentContext = point.toLowerCase();
          return (
            <Text key={i} style={{ ...typography.bodyText, fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 12, marginBottom: 4 }}>
              {point}
            </Text>
          );
        }

        // Check if it should be an indented progress bar (priority context)
        if (currentContext.includes('priority') || currentContext.includes('need')) {
          const percentMatch = point.match(/(\d+)%/);
          if (percentMatch) {
            const percent = parseInt(percentMatch[1], 10);
            const label = point.replace(/\s*\(\d+%\)\s*/, '').replace(/\s*\d+%\s*/, '').replace(/:\s*$/, '').trim();

            return (
              <View key={i} style={{ marginTop: 6, marginBottom: 6, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                  <Text style={{ ...typography.bodyText, fontSize: 12, fontWeight: '600', color: colors.textPrimary, flex: 1 }}>{label}</Text>
                  <Text style={{ ...typography.bodyText, fontSize: 12, fontWeight: '800', color: accent }}>{percent}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: accent + '15', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: accent, borderRadius: 3 }} />
                </View>
              </View>
            );
          }
        }

        const isSubBullet = !!currentContext;

        return (
          <View key={i} style={[styles.bulletRow, { marginLeft: isSubBullet ? 16 : 0, marginTop: isSubBullet ? 4 : 6, alignItems: 'flex-start' }]}>
            <View style={[styles.bulletDot, {
              backgroundColor: isSubBullet ? colors.textSecondary : accent,
              width: isSubBullet ? 5 : 6,
              height: isSubBullet ? 5 : 6,
              borderRadius: isSubBullet ? 2.5 : 3,
              marginTop: isSubBullet ? 7.5 : 7
            }]} />
            <Text style={{ ...typography.bodyText, flex: 1, fontSize: 13, lineHeight: 20, color: colors.textPrimary }}>
              {point}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const AudioPlayer = ({ url }: { url: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  const playSound = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            // If it finished, reset to 0 before playing
            if (status.positionMillis >= (status.durationMillis || 0)) {
              await sound.setPositionAsync(0);
            }
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } else {
        let fullUrl = url;
        if (url.startsWith('https://res.cloudinary.com')) {
          const publicId = url.split('/upload/')[1].split('.').slice(0, -1).join('.');
          const extension = url.split('.').pop();
          fullUrl = `${API_BASE_URL}/chat/serve-file?public_id=${publicId}&extension=${extension}`;
        } else if (!url.startsWith('file://') && !url.startsWith('http')) {
          fullUrl = API_BASE_URL + url;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: true, isLooping: false }
        );
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 1);
            setIsPlaying(status.isPlaying);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        });
        
        setSound(newSound);
      }
    } catch (e) {
      console.log('Error playing sound', e);
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const progress = position / duration;

  return (
    <View style={styles.premiumAudioContainer}>
      <TouchableOpacity onPress={playSound} style={styles.audioPlayBtn}>
        <Feather name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
      </TouchableOpacity>
      <View style={{ flex: 1, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primaryGreen }} />
      </View>
      <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 8, fontFamily: 'monospace' }}>
        {Math.floor(position / 1000)}s / {Math.floor(duration / 1000)}s
      </Text>
    </View>
  );
};

// ─── AI Analyzing Steps ──────────────────────────────────────────────────────
const ANALYSIS_STEPS = (t: any) => [
  { icon: '📸', label: t('volunteer.scan.extracting') || 'Extracting document...' },
  { icon: '🔍', label: 'Detecting handwriting & fields...' },
  { icon: '🤖', label: 'AI analyzing 20+ parameters...' },
  { icon: '✅', label: t('volunteer.scan.analyzing') || 'Preparing your comprehensive report...' },
];

const AnalyzingScreen = ({ fileUris }: { fileUris: string[] }) => {
  const { t } = useLanguage();
  const [stepIndex, setStepIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  
  const steps = ANALYSIS_STEPS(t);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    pulse.start();

    const stepTimer = setInterval(() => {
      Animated.sequence([
        Animated.timing(stepFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(stepFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepIndex(prev => (prev + 1) % steps.length);
    }, 1500);

    return () => { pulse.stop(); clearInterval(stepTimer); };
  }, []);

  const currentStep = steps[stepIndex];
  const isMultiple = fileUris.length > 1;

  return (
    <Animated.View style={[styles.analyzingContainer, { opacity: fadeAnim }]}>
      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orbRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.orb}><Text style={styles.orbIcon}>🤖</Text></View>
      </View>
      <Animated.View style={{ opacity: stepFade, alignItems: 'center' }}>
        <Text style={styles.stepIcon}>{currentStep.icon}</Text>
        <Text style={styles.analyzingTitle}>{currentStep.label}</Text>
      </Animated.View>
      <Text style={styles.analyzingSubtitle}>
        {isMultiple ? `Processing ${fileUris.length} documents...` : 'Gemini AI is reading your document'}
      </Text>
    </Animated.View>
  );
};

export const ScanSurveyScreen = () => {
  const route = useRoute<any>();
  const { t, language } = useLanguage();
  const { user } = useAuthStore();
  const [mainView, setMainView] = useState<'scan_home' | 'field_report' | 'field_report_viewer'>('scan_home');
  const [savedFieldReportData, setSavedFieldReportData] = useState<any>(null);
  const [mode, setMode] = useState<ScreenMode>('idle');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data State
  const [scannedFiles, setScannedFiles] = useState<{ uri: string, type: string, name: string }[]>([]);
  const [batchResults, setBatchResults] = useState<{ parsed: ParsedData, file: any, url?: string, publicId?: string }[]>([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [lastReportId, setLastReportId] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [reportSourceFilter, setReportSourceFilter] = useState<'all' | 'volunteer' | 'citizen'>('volunteer');

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [displayedReport, setDisplayedReport] = useState<Report | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [infoPopup, setInfoPopup] = useState<{ title: string; reason: string; accent?: string } | null>(null);

  const timelineSteps = useMemo(() => {
    if (!displayedReport?.detailed_resolution_steps) return [];
    return getBilingualArray(displayedReport.detailed_resolution_steps, language);
  }, [displayedReport?.detailed_resolution_steps, language]);

  // Full Image Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null | undefined>(null);

  useFocusEffect(useCallback(() => { fetchReports(); }, []));

  useEffect(() => {
    if (route.params?.autoOpenReportId && reports.length > 0) {
      const target = reports.find(r => r.id === route.params.autoOpenReportId);
      if (target) {
        setDisplayedReport(target);
        bottomSheetRef.current?.expand();
      }
    }
  }, [route.params?.autoOpenReportId, reports]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports`);
      const json = await res.json();
      if (json.success) setReports(json.reports);
    } catch (e) { console.error(e); } finally { setLoadingReports(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchReports(); };

  const handleDeleteReport = async (id: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This will also remove any audio/photo attachments from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/reports/${id}`, { method: 'DELETE' });
              const data = await res.json();
              if (data.success) {
                bottomSheetRef.current?.close();
                setDisplayedReport(null);
                fetchReports();
              } else {
                Alert.alert('Error', data.detail || 'Failed to delete');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting');
            }
          }
        }
      ]
    );
  };

  const handleResolveReport = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${id}/resolve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Report marked as Resolved. It will now appear in the citizen\'s Aid History.');
        bottomSheetRef.current?.close();
        fetchReports();
      } else {
        Alert.alert('Error', data.detail || 'Failed to resolve');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to resolve report');
    }
  };

  // ── Actions ──
  const openCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      const file = { uri: result.assets[0].uri, type: 'image/jpeg', name: 'scan.jpg' };
      setScannedFiles([file]);
      processBatch([file]);
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const files = result.assets.map(a => ({
          uri: a.uri, type: a.mimeType || 'application/pdf', name: a.name || 'document.pdf'
        }));
        setScannedFiles(files);
        processBatch(files);
      }
    } catch (error) { console.error(error); }
  };

  const processBatch = async (files: { uri: string, type: string, name: string }[]) => {
    setMode('processing');
    setIsProcessing(true);
    try {
      const results = [];
      for (const file of files) {
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/scan-form`, {
          method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' },
        });
        const result = await response.json();
        if (result.success) {
          results.push({ parsed: result.parsed_data, file, url: result.url, publicId: result.public_id });
        }
      }
      setBatchResults(results);
      setCurrentEditIndex(0);
      setMode('preview');
    } catch (error) {
      Alert.alert('Analysis Failed', 'Could not process the documents.');
      setMode('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitCurrentAndNext = async () => {
    setIsProcessing(true);
    try {
      const currentFileNode = batchResults[currentEditIndex];
      const currentData = currentFileNode.parsed;
      const payload = {
        ...currentData,
        volunteer_id: user?.id || undefined,
        report_source: 'scan',
        photo_url: currentFileNode.url,
        photo_public_id: currentFileNode.publicId
      };

      const response = await fetch(`${API_BASE_URL}/submit-report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.success) {
        setLastReportId(result.report_id);
        if (currentEditIndex < batchResults.length - 1) {
          setCurrentEditIndex(prev => prev + 1);
        } else {
          setMode('success');
          fetchReports();
        }
      } else { throw new Error(result.detail); }
    } catch (error: any) {
      Alert.alert('Submission Error', error.message);
    } finally { setIsProcessing(false); }
  };

  const resetFlow = () => {
    setMode('idle');
    setScannedFiles([]);
    setBatchResults([]);
    setLastReportId(null);
  };

  if (mainView === 'field_report') {
    return <FieldReportScreen onBack={() => setMainView('scan_home')} onComplete={fetchReports} />;
  }

  // ── Field Report Viewer (for saved reports from Recent Scans) ──
  if (mainView === 'field_report_viewer' && savedFieldReportData) {
    const fr = savedFieldReportData;
    const C = { orange: '#FF6D00', violet: '#7C4DFF', blue: '#2979FF', green: '#00C853', yellow: '#FFB300', red: '#FF1744', teal: '#00BFA5' };
    const getEvColor = (t: string) => {
      switch(t?.toLowerCase()) {
        case 'audio': return colors.primarySaffron;
        case 'video': return '#E53935';
        case 'image': return colors.accentBlue;
        case 'pdf': return '#795548';
        case 'community': return '#9C27B0';
        default: return colors.primaryGreen;
      }
    };
    const getEvIcon = (t: string) => {
      switch(t?.toLowerCase()) {
        case 'audio': return 'mic';
        case 'video': return 'video';
        case 'image': return 'image';
        case 'pdf': return 'file-text';
        case 'community': return 'users';
        default: return 'file';
      }
    };
    return (
      <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
        <AppHeader title={fr.report_type || 'Field Report'} showBack onBackPress={() => { setMainView('scan_home'); setSavedFieldReportData(null); }} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={{ backgroundColor: '#1B2838', paddingTop: 30, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Feather name="check" size={30} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 }}>{t('volunteer.scan.reportReady')}</Text>
            <Text style={{ color: C.orange, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{fr.report_type}</Text>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Feather name="map-pin" size={12} color="#aaa" />
                <DynamicText style={{ color: '#ccc', fontSize: 11, fontWeight: '600' }} text={fr.location_summary} collection="field_reports" docId={fr.id} field="location_summary" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 18, gap: 10, width: '100%' }}>
              {[
                { num: fr.media_library?.length || fr.evidence_breakdown?.length || 0, label: t('volunteer.scan.evidence'), color: C.blue },
                { num: fr.community_voice?.length || 0, label: t('volunteer.scan.surveyed'), color: C.violet },
                { num: fr.key_findings?.length || 0, label: t('volunteer.scan.findings'), color: C.orange },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: s.color + '15', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: s.color + '30' }}>
                  <Text style={{ color: s.color, fontSize: 22, fontWeight: '900' }}>{s.num}</Text>
                  <Text style={{ color: s.color + 'AA', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ padding: 16 }}>
            {/* Executive Summary (Orange) */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
              <View style={{ backgroundColor: C.orange + '12', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.orange + '20' }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center' }}>
                  <Feather name="file-text" size={13} color="#fff" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.orange, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.executiveSummary')}</Text>
              </View>
              <View style={{ padding: 16 }}>
                {Array.isArray(fr.executive_summary) ? (
                  fr.executive_summary.map((b: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange, marginTop: 6 }} />
                      <DynamicText style={{ flex: 1, fontSize: 13, lineHeight: 20, color: '#444' }} text={b} collection="field_reports" docId={fr.id} field={`executive_summary_${i}`} />
                    </View>
                  ))
                ) : (
                  <DynamicText style={{ fontSize: 13, lineHeight: 20, color: '#444' }} text={fr.executive_summary} collection="field_reports" docId={fr.id} field="executive_summary" />
                )}
              </View>
            </View>

            {/* Evidence Analysis (Blue) */}
            {fr.evidence_breakdown?.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
                <View style={{ backgroundColor: C.blue + '12', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.blue + '20' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="search" size={13} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.blue, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.evidenceAnalysis')}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={{ backgroundColor: C.blue + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: C.blue }}>{fr.evidence_breakdown.length} {t('volunteer.scan.items')}</Text>
                  </View>
                </View>
                <View style={{ padding: 12 }}>
                  {fr.evidence_breakdown.map((ev: any, i: number) => {
                    const evType = ev.evidence_type?.toLowerCase() || 'note';
                    const evColor = getEvColor(evType);
                    const mediaUrl = fr.media_library?.find((m: any) => m.type === evType)?.url || ev.url;
                    return (
                      <View key={i} style={{ backgroundColor: evColor + '08', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: evColor }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: evColor + '18', justifyContent: 'center', alignItems: 'center' }}>
                            <Feather name={getEvIcon(evType) as any} size={16} color={evColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <DynamicText style={{ fontWeight: '700', fontSize: 13, color: '#333' }} text={ev.evidence_label || ev.evidence_type} collection="field_reports" docId={fr.id} field={`evidence_label_${i}`} />
                            <DynamicText style={{ fontSize: 9, color: evColor, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 }} text={ev.evidence_type} collection="field_reports" docId={fr.id} field={`evidence_type_${i}`} />
                          </View>
                          {mediaUrl && (
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blue + '12', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }} onPress={() => Linking.openURL(mediaUrl)}>
                              <Feather name="eye" size={12} color={C.blue} />
                              <Text style={{ fontSize: 11, color: C.blue, fontWeight: '700' }}>{t('volunteer.scan.view')}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {ev.three_line_extraction?.map((line: string, j: number) => (
                          <DynamicText key={j} style={{ fontSize: 12, color: '#555', lineHeight: 18, paddingLeft: 42, marginBottom: 3 }} text={`• ${line}`} collection="field_reports" docId={fr.id} field={`evidence_extraction_${i}_${j}`} />
                        ))}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Conclusion (Green) */}
            {fr.evidence_conclusion && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2, borderLeftWidth: 4, borderLeftColor: C.green }}>
                <View style={{ backgroundColor: C.green + '10', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.green + '20' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="check-circle" size={13} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.conclusion')}</Text>
                </View>
                <View style={{ padding: 16 }}>
                  {Array.isArray(fr.evidence_conclusion) ? (
                    fr.evidence_conclusion.map((b: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green, marginTop: 6 }} />
                          <DynamicText style={{ flex: 1, fontSize: 13, lineHeight: 20, color: '#444' }} text={b} collection="field_reports" docId={fr.id} field={`conclusion_${i}`} />
                        </View>
                    ))
                  ) : (
                    <DynamicText style={{ fontSize: 13, lineHeight: 20, color: '#444' }} text={fr.evidence_conclusion} collection="field_reports" docId={fr.id} field="conclusion" />
                  )}
                </View>
              </View>
            )}

            {/* Key Findings (Yellow) */}
            {fr.key_findings?.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
                <View style={{ backgroundColor: C.yellow + '15', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.yellow + '25' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="zap" size={13} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#E65100', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.keyFindings')}</Text>
                </View>
                <View style={{ padding: 14 }}>
                  {fr.key_findings.map((f: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow + '20', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#E65100' }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <DynamicText style={{ fontWeight: '700', fontSize: 13, color: '#333' }} text={f.category} collection="field_reports" docId={fr.id} field={`finding_category_${i}`} />
                        <DynamicText style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 18 }} text={f.observation} collection="field_reports" docId={fr.id} field={`finding_${i}`} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Needs Assessment (Red) */}
            {fr.needs_assessment?.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
                <View style={{ backgroundColor: C.red + '0A', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.red + '15' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="alert-triangle" size={13} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.red, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.needsAssessment')}</Text>
                </View>
                <View style={{ padding: 12 }}>
                  {fr.needs_assessment.map((n: any, i: number) => {
                    const isCrit = n.severity === 'High' || n.severity === 'Critical';
                    return (
                      <View key={i} style={{ backgroundColor: isCrit ? C.red + '06' : '#f8f9fa', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: isCrit ? C.red : C.teal }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <DynamicText style={{ fontWeight: '700', fontSize: 13, flex: 1, color: '#333' }} text={n.need} collection="field_reports" docId={fr.id} field={`need_${i}`} />
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isCrit ? C.red + '15' : C.teal + '15' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: isCrit ? C.red : C.teal }}>{n.severity}</Text>
                          </View>
                        </View>
                        <DynamicText style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 17 }} text={n.rationale} collection="field_reports" docId={fr.id} field={`need_rationale_${i}`} />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Community Voice (Violet) */}
            {fr.community_voice?.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
                <View style={{ backgroundColor: C.violet + '10', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.violet + '20' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.violet, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="message-circle" size={13} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.violet, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.communityVoice')}</Text>
                </View>
                <View style={{ padding: 12 }}>
                  {fr.community_voice.map((cv: any, i: number) => (
                    <View key={i} style={{ backgroundColor: C.violet + '06', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.violet }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.violet + '18', justifyContent: 'center', alignItems: 'center' }}>
                          <Feather name="user" size={11} color={C.violet} />
                        </View>
                        <DynamicText style={{ fontWeight: '700', fontSize: 13, flex: 1, color: '#333' }} text={cv.member} collection="field_reports" docId={fr.id} field={`survey_member_${i}`} />
                        {cv.media_captured && (
                          <Text style={{ fontSize: 9, color: C.violet, backgroundColor: C.violet + '12', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '700', textTransform: 'uppercase' }}>{cv.media_captured}</Text>
                        )}
                      </View>
                      <DynamicText style={{ fontSize: 13, color: '#555', lineHeight: 18 }} text={cv.summary} collection="field_reports" docId={fr.id} field={`survey_summary_${i}`} />
                      {cv.notable_quote && (
                        <View style={{ backgroundColor: C.violet + '08', borderRadius: 8, padding: 8, marginTop: 6 }}>
                          <DynamicText style={{ fontSize: 12, color: C.violet, fontStyle: 'italic' }} text={`"${cv.notable_quote}"`} collection="field_reports" docId={fr.id} field={`survey_quote_${i}`} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Follow-up (Teal) */}
            {fr.recommended_follow_up?.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', elevation: 2 }}>
                <View style={{ backgroundColor: C.teal + '10', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.teal + '20' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.teal, justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="arrow-right-circle" size={13} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('volunteer.scan.followUpActions')}</Text>
                </View>
                <View style={{ padding: 14 }}>
                  {fr.recommended_follow_up.map((item: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.teal + '15', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                        <Feather name="chevron-right" size={12} color={C.teal} />
                      </View>
                      <DynamicText style={{ flex: 1, fontSize: 13, color: '#444', lineHeight: 19 }} text={item} collection="field_reports" docId={fr.id} field={`follow_up_${i}`} />
                    </View>
                  ))}
                </View>
              </View>
            )}

            <PrimaryButton title={t('assignments.gotIt')} onPress={() => { setMainView('scan_home'); setSavedFieldReportData(null); }} style={{ marginVertical: 20 }} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const renderPreviewForm = () => {
    const fileNode = batchResults[currentEditIndex];
    if (!fileNode) return null;
    const { parsed, file } = fileNode;

    const updateField = (field: keyof ParsedData, val: any) => {
      const newResults = [...batchResults];
      newResults[currentEditIndex].parsed = { ...newResults[currentEditIndex].parsed, [field]: val };
      setBatchResults(newResults);
    };

    return (
      <View style={{ flex: 1 }}>
        <Text style={styles.batchInfo}>
          Reviewing Document {currentEditIndex + 1} of {batchResults.length}
        </Text>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {file.type.startsWith('image/') ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.imageCard}
              onPress={() => {
                setViewerUri(file.uri);
                setViewerVisible(true);
              }}
            >
              <Image source={{ uri: file.uri }} style={styles.previewImage} resizeMode="cover" />
              <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                <Feather name="maximize" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.imageCard, { backgroundColor: colors.primaryGreen + '10', justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => {
                import('react-native').then(rn => rn.Linking.openURL(file.uri));
              }}
            >
              <Feather name="file-text" size={64} color={colors.primaryGreen} />
              <Text style={{ ...typography.bodyText, color: colors.primaryGreen, marginTop: spacing.sm, fontWeight: '700' }}>PDF Document Attached</Text>
              <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                <Feather name="external-link" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Section 1: Who & Where */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>1. {t('volunteer.scan.whoWhere')}</Text>
            <FormField label={t('volunteer.scan.citizenName')} value={parsed.citizen_name} onChangeText={(t: string) => updateField('citizen_name', t)} />
            <FormField label={t('volunteer.scan.location')} value={parsed.precise_location} onChangeText={(t: string) => updateField('precise_location', t)} />
            <FormField label="GPS (Auto-extracted)" value={parsed.gps_coordinates} onChangeText={(t: string) => updateField('gps_coordinates', t)} />
          </View>

          {/* Section 2: Problem */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>2. {t('volunteer.scan.theProblem')}</Text>
            <FormField label={t('volunteer.scan.executiveSummary')} value={parsed.executive_summary} onChangeText={(t: string) => updateField('executive_summary', t)} multiline />
            <FormField label={t('volunteer.scan.primaryCategory')} value={parsed.primary_category} onChangeText={(t: string) => updateField('primary_category', t)} />
            <FormField label={t('volunteer.digitalSurvey.subCategory')} value={parsed.sub_category} onChangeText={(t: string) => updateField('sub_category', t)} />
            <FormField label={t('volunteer.digitalSurvey.durationOfProblem')} value={parsed.duration_of_problem} onChangeText={(t: string) => updateField('duration_of_problem', t)} />
            <FormField label={t('volunteer.scan.urgencyLevel')} value={parsed.urgency_level} onChangeText={(t: string) => updateField('urgency_level', t)} />
          </View>

          {/* Section 3: Impact */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>3. {t('volunteer.scan.impactAssessment')}</Text>
            <FormField label={t('volunteer.scan.severityScore')} value={parsed.severity_score?.toString()} onChangeText={(t: string) => updateField('severity_score', parseInt(t))} keyboardType="numeric" />
            <FormField label={t('volunteer.scan.populationAffected')} value={parsed.population_affected?.toString()} onChangeText={(t: string) => updateField('population_affected', parseInt(t))} keyboardType="numeric" />
            <FormField label={t('volunteer.digitalSurvey.vulnerabilityFlag')} value={parsed.vulnerable_group} onChangeText={(t: string) => updateField('vulnerable_group', t)} placeholder="women / children / elderly / disabled" />
          </View>

          {/* Section 4: Action & Follow-up */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>4. {t('volunteer.scan.actionFollowUp')}</Text>
            <FormField
              label={t('volunteer.scan.resolutionTimeline')}
              value={parsed.expected_resolution_timeline?.join('\n')}
              onChangeText={(t: string) => updateField('expected_resolution_timeline', t.split('\n').filter(s => s.trim()))}
              multiline
              placeholder="Phase 1: ...\nPhase 2: ..."
            />
            <FormField
              label={t('volunteer.scan.resolutionSteps')}
              value={parsed.detailed_resolution_steps?.join('\n')}
              onChangeText={(t: string) => updateField('detailed_resolution_steps', t.split('\n').filter(s => s.trim()))}
              multiline
              placeholder="Step 1: ...\nStep 2: ..."
            />
            <FormField label={t('volunteer.scan.govtScheme')} value={parsed.govt_scheme_applicable} onChangeText={(t: string) => updateField('govt_scheme_applicable', t)} />
            <FormField label={t('volunteer.scan.aiRecommendations')} value={parsed.ai_recommended_actions} onChangeText={(t: string) => updateField('ai_recommended_actions', t)} multiline />
          </View>

          {/* Section 5: Qualitative */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>5. {t('volunteer.scan.communityVoice')}</Text>
            <FormField label={t('volunteer.digitalSurvey.keyComplaints')} value={parsed.previous_complaints_insights} onChangeText={(t: string) => updateField('previous_complaints_insights', t)} multiline />
            <FormField label={t('volunteer.digitalSurvey.keyComplaints')} value={parsed.key_complaints?.join(', ')} onChangeText={(t: string) => updateField('key_complaints', t.split(',').map(s => s.trim()))} />
            <FormField label={t('volunteer.digitalSurvey.communitySentiment')} value={parsed.sentiment} onChangeText={(t: string) => updateField('sentiment', t)} />
            <FormField label={t('volunteer.digitalSurvey.detailedDescription')} value={parsed.description} onChangeText={(t: string) => updateField('description', t)} multiline />
          </View>

          <View style={styles.buttonRow}>
            <PrimaryButton
              title={isProcessing ? t('community.submitting') : (currentEditIndex < batchResults.length - 1 ? 'Save & Next' : t('volunteer.scan.submitReport'))}
              onPress={submitCurrentAndNext}
              style={styles.submitBtn}
              disabled={isProcessing}
            />
            <TouchableOpacity onPress={resetFlow} style={styles.retakeBtn}>
              <Text style={styles.retakeText}>{t('assignments.reset')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('volunteer.scan.title')} showBack={mode !== 'idle'} onBackPress={resetFlow} />

      {mode === 'idle' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.idleScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text style={styles.sectionLabel}>{t('volunteer.scan.uploadDocument').toUpperCase()}</Text>
          <View style={styles.selectionGrid}>
            <SelectionCard icon="file-text" title={t('volunteer.scan.uploadDocument')} description="PDFs & Images" onPress={pickFiles} color={colors.primaryGreen} />
            <SelectionCard icon="camera" title={t('volunteer.scan.camera')} description="Use Camera" onPress={openCamera} color={colors.accentBlue} />
            <SelectionCard icon="mic" title={t('volunteer.fieldReport.title')} description="Photo + Voice + GPS" onPress={() => setMainView('field_report')} color={colors.primarySaffron} />
          </View>

          {/* Source Filter Tabs */}
          <View style={styles.sourceTabsContainer}>
            <TouchableOpacity 
              style={[styles.sourceTab, reportSourceFilter === 'volunteer' && styles.sourceTabActive]} 
              onPress={() => setReportSourceFilter('volunteer')}
            >
              <Feather name="user-check" size={14} color={reportSourceFilter === 'volunteer' ? '#fff' : colors.textSecondary} />
              <Text style={[styles.sourceTabText, reportSourceFilter === 'volunteer' && styles.sourceTabTextActive]}>{t('volunteer.scan.filterVolunteer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sourceTab, reportSourceFilter === 'citizen' && styles.sourceTabActive]} 
              onPress={() => setReportSourceFilter('citizen')}
            >
              <Feather name="users" size={14} color={reportSourceFilter === 'citizen' ? '#fff' : colors.textSecondary} />
              <Text style={[styles.sourceTabText, reportSourceFilter === 'citizen' && styles.sourceTabTextActive]}>{t('volunteer.scan.filterCitizen')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sourceTab, reportSourceFilter === 'all' && styles.sourceTabActive]} 
              onPress={() => setReportSourceFilter('all')}
            >
              <Text style={[styles.sourceTabText, reportSourceFilter === 'all' && styles.sourceTabTextActive]}>{t('volunteer.scan.filterAll')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={[styles.sectionLabel, { marginVertical: 0 }]}>{t('volunteer.scan.recentScans').toUpperCase()}</Text>
            <View style={{ width: 140 }}>
              <DropdownField 
                placeholder={t('volunteer.scan.allCategories')} 
                options={CATEGORIES.map(c => t(`categories.${c.toLowerCase()}`) !== `categories.${c.toLowerCase()}` ? t(`categories.${c.toLowerCase()}`) : c)} 
                onSelect={(val: string) => {
                  const original = CATEGORIES.find(c => t(`categories.${c.toLowerCase()}`) === val) || val;
                  setSelectedCategory(original);
                }}                minimal 
              />
            </View>
          </View>

          {loadingReports ? (
            <ShimmerCardList count={3} />
          ) : (
            reports.filter(r => {
              // 1. Source Filter
              const isVolunteer = r.report_source === 'scan' || r.report_source === 'field_report' || !r.report_source;
              const isCitizen = r.report_source === 'citizen_report';
              
              if (reportSourceFilter === 'volunteer' && !isVolunteer) return false;
              if (reportSourceFilter === 'citizen' && !isCitizen) return false;
              
              // 2. Category Filter
              if (selectedCategory === 'All') return true;
              return (
                getBilingualText(r.primary_category, language) === selectedCategory || 
                getBilingualText(r.auto_category, language) === selectedCategory || 
                r.issue_type === selectedCategory
              );
            }).map(r => {
              const urgCfg = getUrgencyConfig(getBilingualText(r.urgency_level, language));
              const sevCfg = getSeverityConfig(r.severity_score);
              const catText = getBilingualText(r.primary_category, language) || getBilingualText(r.auto_category, language) || r.issue_type;
              const iColor = issueColor(catText);
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.75}
                style={[styles.reportCard, { borderLeftWidth: 4, borderLeftColor: iColor }]}
                onPress={() => {
                  // If it's a field report, open the dedicated viewer
                  if (r.report_source === 'field_report' && r.field_report_data) {
                    try {
                      const parsed = typeof r.field_report_data === 'string' ? JSON.parse(r.field_report_data) : r.field_report_data;
                      setSavedFieldReportData(parsed);
                      setMainView('field_report_viewer');
                    } catch { 
                      setDisplayedReport(r); bottomSheetRef.current?.expand(); 
                    }
                  } else {
                    setDisplayedReport(r); bottomSheetRef.current?.expand();
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 }}>
                  <View style={[styles.reportBadge, { backgroundColor: iColor + '15' }]}>
                    <Feather name="file-text" size={18} color={iColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DynamicText style={styles.reportName} numberOfLines={1} text={r.citizen_name || 'Anonymous'} />
                    <DynamicText style={styles.reportMetaText} numberOfLines={1} text={r.precise_location || r.location || 'Location N/A'} />
                  </View>
                  <Text style={styles.reportDate}>{formatDate(r.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {/* Category pill */}
                  <View style={[styles.categoryPill, { backgroundColor: iColor + '15', paddingVertical: 3 }]}>
                    <DynamicText style={[styles.categoryPillText, { color: iColor, fontSize: 11 }]} text={catText || 'General'} />
                  </View>
                  {/* Urgency pill */}
                  {r.urgency_level && (
                    <View style={[styles.urgencyBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.color + '60', paddingVertical: 2, marginTop: 0 }]}>
                      <View style={[styles.urgencyDot, { backgroundColor: urgCfg.color }]} />
                      <Text style={[styles.urgencyBadgeText, { color: urgCfg.color, fontSize: 11 }]}>
                        {(urgCfg.key && t(`supervisor.crisisHeatmap.${urgCfg.key}`) !== `supervisor.crisisHeatmap.${urgCfg.key}`) ? t(`supervisor.crisisHeatmap.${urgCfg.key}`) : urgCfg.label}
                      </Text>
                    </View>
                  )}
                  {/* Severity chip */}
                  {r.severity_score !== undefined && (
                    <View style={[styles.gaugeLabelBadge, { backgroundColor: sevCfg.color + '18', borderColor: sevCfg.color + '50' }]}>
                      <Text style={[styles.gaugeLabelText, { color: sevCfg.color, fontSize: 11 }]}>
                        Severity {r.severity_score}/10
                      </Text>
                    </View>
                  )}
                </View>
                </TouchableOpacity>
              );
            }))}
        </ScrollView>
      )}

      {mode === 'processing' && <AnalyzingScreen fileUris={scannedFiles.map(f => f.uri)} />}
      {mode === 'preview' && renderPreviewForm()}
      {mode === 'success' && (
        <View style={styles.celebWrapper}>
          <ConfettiOverlay play />
          <Feather name="check-circle" size={80} color={colors.success} />
          <Text style={styles.celebTitle}>{t('volunteer.digitalSurvey.successTitle')}</Text>
          <Text style={styles.celebSubtitle}>{t('volunteer.digitalSurvey.successDesc')}</Text>
          <View style={{ gap: spacing.md, width: '100%', paddingHorizontal: spacing.xxl }}>
            {lastReportId && (
              <TouchableOpacity
                style={{ backgroundColor: colors.primaryGreen, padding: spacing.md, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  const r = reports.find(rep => rep.id === lastReportId);
                  if (r) {
                    setDisplayedReport(r);
                    setMode('idle');
                    bottomSheetRef.current?.expand();
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('volunteer.digitalSurvey.viewReportDetails')}</Text>
              </TouchableOpacity>
            )}
            <PrimaryButton
              title={t('assignments.gotIt')}
              onPress={resetFlow}
              style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primaryGreen, elevation: 0, shadowOpacity: 0 }}
              textStyle={{ color: colors.primaryGreen }}
            />
          </View>
        </View>
      )}

      {/* Info Popup Modal for Severity / Urgency */}
      <Modal
        visible={!!infoPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoPopup(null)}
      >
        <TouchableWithoutFeedback onPress={() => setInfoPopup(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, infoPopup?.accent ? { color: infoPopup.accent } : {}]}>{infoPopup?.title}</Text>
                  <TouchableOpacity onPress={() => setInfoPopup(null)}>
                    <Feather name="x" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={{ padding: spacing.md }}>
                  <DetailBulletList text={infoPopup?.reason} accent={infoPopup?.accent || colors.primaryGreen} />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Detailed Timeline Modal – Week-by-Week */}
      <Modal visible={showTimelineModal} transparent animationType="fade" onRequestClose={() => setShowTimelineModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowTimelineModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: '#0D47A1', fontWeight: '800' }]}>{t('volunteer.scan.timelineModalTitle')}</Text>
                  <TouchableOpacity onPress={() => setShowTimelineModal(false)}>
                    <Feather name="x" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
                  {timelineSteps.length > 0 ? (
                    timelineSteps.map((step: string, i: number) => {
                      const weekStart = i * 2 + 1;
                      const weekEnd = weekStart + 1;
                      return <AnimatedWeekRow key={i} step={step} weekStart={weekStart} weekEnd={weekEnd} index={i} />;
                    })
                  ) : (
                    <Text style={styles.emptyText}>{t('volunteer.scan.noResolutionSteps')}</Text>
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Bottom Sheet for Detail View */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%', '85%']}
        enablePanDownToClose
        onClose={() => setDisplayedReport(null)}
        backgroundStyle={{ backgroundColor: colors.cardBackground, borderRadius: 24 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}>
          {/* Header */}
          <View style={styles.bsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t('volunteer.scan.reportDetails')}</Text>
              <DynamicText style={styles.bsSubtitle} numberOfLines={1} text={displayedReport?.precise_location || displayedReport?.location || t('common.n/a')} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {displayedReport && <UrgencyBadge level={getBilingualText(displayedReport.urgency_level, language)} />}
              <TouchableOpacity onPress={() => bottomSheetRef.current?.close()} style={styles.bsCloseBtn}>
                <Feather name="x" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {displayedReport && (
            <>
              {displayedReport.report_source === 'citizen_report' ? (
                // ─── Simplified Citizen View ───
                <>
                  {/* Section 1: Citizen Info */}
                  <View style={[styles.sectionCard, { borderLeftColor: colors.accentBlue }]}>
                    <SectionHeader number="" title="Citizen Information" icon="user" accent={colors.accentBlue} />
                    <View style={styles.infoCard}>
                      <DetailRow icon="user" label="Reported By" value={displayedReport.citizen_name || 'Anonymous'} />
                      <DetailRow icon="mail" label="Contact" value={displayedReport.phone || 'N/A'} />
                      <DetailRow icon="map-pin" label="Location" value={displayedReport.precise_location || displayedReport.location} />
                    </View>
                  </View>

                  {/* Section 2: Issue Details */}
                  <View style={[styles.sectionCard, { borderLeftColor: colors.primarySaffron }]}>
                    <SectionHeader number="" title="Reported Issue" icon="alert-circle" accent={colors.primarySaffron} />
                    <View style={{ marginBottom: spacing.md }}>
                      <View style={[styles.categoryPill, { alignSelf: 'flex-start', backgroundColor: issueColor(getBilingualText(displayedReport.primary_category, language)) + '15' }]}>
                        <Feather name="grid" size={14} color={issueColor(getBilingualText(displayedReport.primary_category, language))} />
                        <Text style={[styles.categoryPillText, { color: issueColor(getBilingualText(displayedReport.primary_category, language)) }]}>
                          {getBilingualText(displayedReport.primary_category, language)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.citizenDescBox}>
                      <Text style={styles.detailLabel}>DESCRIPTION</Text>
                      <Text style={styles.citizenDescText}>{getBilingualText(displayedReport.description, language)}</Text>
                    </View>
                  </View>

                  {/* Section 3: Multimedia Attachments */}
                  <View style={[styles.sectionCard, { borderLeftColor: colors.success }]}>
                    <SectionHeader number="" title="Multimedia Attachments" icon="paperclip" accent={colors.success} />
                    
                    {/* Image Gallery */}
                    {(displayedReport.photo_url || displayedReport.media_attachments?.some((m: any) => m.type === 'image')) && (
                      <View style={{ marginBottom: spacing.md }}>
                        <Text style={styles.detailLabel}>PHOTOS</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                          {displayedReport.photo_url && (
                            <TouchableOpacity onPress={() => { setViewerUri(displayedReport.photo_url); setViewerVisible(true); }} style={styles.attachmentImageWrapper}>
                              <Image source={{ uri: displayedReport.photo_url }} style={styles.attachmentImage} />
                            </TouchableOpacity>
                          )}
                          {displayedReport.media_attachments?.filter((m: any) => m.type === 'image').map((img: any, idx: number) => (
                            <TouchableOpacity key={idx} onPress={() => { setViewerUri(img.url); setViewerVisible(true); }} style={styles.attachmentImageWrapper}>
                              <Image source={{ uri: img.url }} style={styles.attachmentImage} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Audio Player */}
                    {(displayedReport.audio_url || displayedReport.media_attachments?.some((m: any) => m.type === 'audio')) && (
                      <View>
                        <Text style={styles.detailLabel}>VOICE DESCRIPTION</Text>
                        {displayedReport.audio_url && <AudioPlayer url={displayedReport.audio_url} />}
                        {displayedReport.media_attachments?.filter((m: any) => m.type === 'audio').map((aud: any, idx: number) => (
                          <AudioPlayer key={idx} url={aud.url} />
                        ))}
                      </View>
                    )}

                    {!displayedReport.photo_url && !displayedReport.audio_url && (!displayedReport.media_attachments || displayedReport.media_attachments.length === 0) && (
                      <Text style={styles.emptyText}>No multimedia attachments found.</Text>
                    )}
                  </View>
                </>
              ) : (
                // ─── Standard Volunteer View ───
                <>
                  {/* Section 1: Who & Where */}
                  <View style={[styles.sectionCard, { borderLeftColor: colors.primaryGreen }]}>
                    <SectionHeader number="1" title={t('volunteer.scan.whoWhere')} icon="map-pin" />
                    <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: colors.primaryGreen }]}>
                      <DetailRow icon="user" label={t('volunteer.scan.citizenName')} value={displayedReport.citizen_name || 'Anonymous'} collection="community_reports" docId={displayedReport.id} field="citizen_name" />
                      <DetailRow icon="phone" label={t('volunteer.scan.phone')} value={displayedReport.phone} />
                      <DetailRow icon="map-pin" label={t('volunteer.scan.location')} value={displayedReport.precise_location || displayedReport.location} collection="community_reports" docId={displayedReport.id} field="precise_location" />
                      {displayedReport.gps_coordinates && (
                        <DetailRow icon="navigation" label={t('volunteer.scan.gpsAuto')} value={displayedReport.gps_coordinates} />
                      )}
                    </View>
                  </View>

                  {/* Section 2: The Problem */}
                  <View style={[styles.sectionCard, { borderLeftColor: colors.primaryGreen }]}>
                    <SectionHeader number="2" title={t('volunteer.scan.theProblem')} icon="alert-circle" />
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                      <View style={[styles.categoryPill, { backgroundColor: issueColor(getBilingualText(displayedReport.primary_category, language) || getBilingualText(displayedReport.auto_category, language)) + '18' }]}>
                        <Feather name="grid" size={13} color={issueColor(getBilingualText(displayedReport.primary_category, language) || getBilingualText(displayedReport.auto_category, language))} />
                        <Text style={[styles.categoryPillText, { color: issueColor(getBilingualText(displayedReport.primary_category, language) || getBilingualText(displayedReport.auto_category, language)) }]}>
                          {getBilingualText(displayedReport.primary_category, language) || getBilingualText(displayedReport.auto_category, language) || 'General'}
                        </Text>
                      </View>
                    </View>
                    {getBilingualText(displayedReport.executive_summary, language) && (
                      <View style={styles.summaryBlock}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Feather name="file-text" size={14} color={colors.primaryGreen} />
                          <Text style={styles.summaryLabel}>{t('volunteer.scan.executiveSummary').toUpperCase()}</Text>
                        </View>
                        <DynamicText 
                          style={styles.summaryText} 
                          text={getBilingualText(displayedReport.executive_summary, language)} 
                          collection="community_reports"
                          docId={displayedReport.id}
                          field="executive_summary"
                        />
                      </View>
                    )}
                    <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: colors.primaryGreen }]}>
                      <DetailRow icon="alert-triangle" label={t('volunteer.scan.urgencyLevel')} value={getBilingualText(displayedReport.urgency_level, language)} collection="community_reports" docId={displayedReport.id} field="urgency_level" />
                      <DetailRow icon="clock" label={t('volunteer.scan.duration')} value={getBilingualText(displayedReport.duration_of_problem, language)} collection="community_reports" docId={displayedReport.id} field="duration_of_problem" />
                    </View>
                  </View>

                  {/* Section 3: Impact & Severity */}
                  <View style={[styles.sectionCard, { borderLeftColor: "#E53935" }]}>
                    <SectionHeader number="3" title={t('volunteer.scan.impactSeverity')} icon="activity" accent="#E53935" />
                    <SeverityGauge
                      score={displayedReport.severity_score}
                      onInfoPress={() => setInfoPopup({
                        title: t('volunteer.scan.severityScore'),
                        accent: '#E53935',
                        reason: getBilingualText(displayedReport.severity_reason, language) || 'AI analysis based on multiple factors.'
                      })}
                    />
                    {displayedReport.population_affected != null && (
                      <View style={styles.popCard}>
                        <Feather name="users" size={20} color="#1976D2" />
                        <View style={{ marginLeft: spacing.md }}>
                          <Text style={styles.popNumber}>{Number(displayedReport.population_affected).toLocaleString()}</Text>
                          <Text style={styles.popLabel}>{t('volunteer.scan.peopleAffected')}</Text>
                        </View>
                      </View>
                    )}
                    <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: '#E53935' }]}>
                      <DetailRow icon="user-plus" label={t('volunteer.scan.vulnerableGroup')} value={getBilingualText(displayedReport.vulnerable_group, language)} color="#E53935" collection="community_reports" docId={displayedReport.id} field="vulnerable_group" />
                      <DetailRow icon="message-circle" label={t('volunteer.scan.keyComplaints')} value={getBilingualArray(displayedReport.key_complaints, language).join(', ')} color="#E53935" collection="community_reports" docId={displayedReport.id} field="key_complaints" />
                      {getBilingualText(displayedReport.description, language) && (
                        <View style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
                          <Text style={[styles.detailLabel, { marginBottom: 6 }]}>{t('volunteer.scan.descriptionNeeds')}</Text>
                          <DynamicText 
                            style={styles.detailValue} 
                            text={getBilingualText(displayedReport.description, language)} 
                            collection="community_reports"
                            docId={displayedReport.id}
                            field="description"
                          />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Section 4: AI Insights */}
                  <View style={[styles.sectionCard, { borderLeftColor: '#1976D2' }]}>
                    <SectionHeader number="4" title={t('volunteer.scan.aiInsights')} icon="zap" accent="#1976D2" />
                    <View style={styles.aiCard}>
                      <Text style={styles.aiSubLabel}>{t('volunteer.scan.aiRecommendations')}</Text>
                      <DynamicText 
                        style={styles.detailValue} 
                        text={getBilingualText(displayedReport.ai_recommended_actions, language)} 
                        collection="community_reports"
                        docId={displayedReport.id}
                        field="ai_recommended_actions"
                      />
                    </View>
                    {getBilingualText(displayedReport.govt_scheme_applicable, language) && (
                      <View style={styles.schemeCard}>
                        <Text style={styles.schemeLabel}>{t('volunteer.scan.govtScheme')}</Text>
                        <DynamicText 
                          style={styles.schemeName} 
                          text={getBilingualText(displayedReport.govt_scheme_applicable, language)} 
                          collection="community_reports"
                          docId={displayedReport.id}
                          field="govt_scheme_applicable"
                        />
                      </View>
                    )}
                  </View>

                  {/* Section 5: Solutions history */}
                  <View style={[styles.sectionCard, { borderLeftColor: '#8E24AA' }]}>
                    <SectionHeader number="5" title={t('volunteer.scan.solutionsHistory')} icon="check-circle" accent="#8E24AA" />
                    <View style={styles.solutionsCard}>
                      {displayedReport.detailed_resolution_steps && getBilingualArray(displayedReport.detailed_resolution_steps, language).slice(0, 3).map((sol: string, idx: number) => (
                        <View key={idx} style={styles.solutionRow}>
                          <View style={styles.solutionBullet}><Feather name="check" size={11} color="#fff" /></View>
                          <DynamicText 
                            style={styles.solutionText} 
                            text={sol} 
                            collection="community_reports"
                            docId={displayedReport.id}
                            field={`resolution_step_${idx}`}
                          />
                        </View>
                      ))}
                      <AnimatedTimelineBtn onPress={() => setShowTimelineModal(true)} />
                    </View>
                  </View>

                  {/* Attachments */}
                  {(displayedReport.media_attachments?.length || displayedReport.photo_url) ? (
                    <View style={[styles.sectionCard, { borderLeftColor: colors.primarySaffron }]}>
                      <SectionHeader number="" title={t('volunteer.scan.attachments')} icon="paperclip" accent={colors.primarySaffron} />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {[...(displayedReport.media_attachments || []), ...(displayedReport.photo_url ? [{ url: displayedReport.photo_url, type: 'image' }] : [])].map((img, idx) => (
                          <TouchableOpacity key={idx} onPress={() => { setViewerUri(img.url); setViewerVisible(true); }} style={{ width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden' }}>
                            <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              )}

              {/* Action Buttons */}
              <View style={{ gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xl }}>
                {displayedReport.status !== 'Resolved' && displayedReport.status !== 'Completed' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ backgroundColor: colors.success, padding: spacing.md, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
                    onPress={() => handleResolveReport(displayedReport.id)}
                  >
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={{ ...typography.bodyText, color: '#fff', fontWeight: '800' }}>Mark as Resolved</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#FFEBEE', padding: spacing.md, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5393520', gap: spacing.sm }}
                  onPress={() => handleDeleteReport(displayedReport.id)}
                >
                  <Feather name="trash-2" size={18} color="#E53935" />
                  <Text style={{ ...typography.bodyText, color: '#E53935', fontWeight: '700' }}>{t('volunteer.reports.deleteReport')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <FullImageViewer visible={viewerVisible} imageUri={viewerUri} onClose={() => setViewerVisible(false)} />
    </View>
  );
};





const SelectionCard = ({ icon, title, description, onPress, color }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
      <Feather name={icon} size={28} color={color} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardDesc}>{description}</Text>
  </TouchableOpacity>
);

const FormField = ({ label, value, onChangeText, keyboardType = 'default', multiline = false, placeholder = '' }: any) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      placeholder={placeholder}
    />
  </View>
);

const DropdownField = ({ label, options, selected, onSelect, placeholder = 'Select an option', minimal = false }: any) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={[styles.fieldContainer, minimal && { marginBottom: 0 }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, minimal && { padding: spacing.sm, minHeight: 40 }, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text numberOfLines={1} style={{ ...typography.bodyText, flex: 1, color: selected ? colors.textPrimary : colors.textSecondary + '80' }}>
          {selected || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{label || placeholder}</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {options.map((opt: string) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.dropdownItem, selected === opt && styles.dropdownItemActive]}
                      onPress={() => { onSelect(opt); setIsOpen(false); }}
                    >
                      <Text style={{ ...typography.bodyText, fontSize: 15, color: selected === opt ? colors.primaryGreen : colors.textPrimary, fontWeight: selected === opt ? '700' : '400' }}>
                        {t(`categories.${opt.toLowerCase()}`) !== `categories.${opt.toLowerCase()}` ? t(`categories.${opt.toLowerCase()}`) : opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  idleScroll: { padding: spacing.lg },
  sectionLabel: { ...typography.captionText, color: colors.textSecondary, fontWeight: '700', marginVertical: spacing.md },
  selectionGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  sourceTabsContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 14, padding: 4, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.textSecondary + '20' },
  sourceTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  sourceTabActive: { backgroundColor: colors.primaryGreen, elevation: 3, shadowColor: colors.primaryGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  sourceTabText: { ...typography.bodyText, fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  sourceTabTextActive: { color: '#fff' },
  card: { flex: 1, backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md, alignItems: 'center', elevation: 2 },
  iconWrapper: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { ...typography.bodyText, fontWeight: '700', textAlign: 'center' },
  cardDesc: { ...typography.captionText, textAlign: 'center', fontSize: 10 },

  reportCard: { backgroundColor: colors.cardBackground, borderRadius: 12, padding: spacing.md, marginVertical: spacing.xs, elevation: 1, overflow: 'hidden' },
  reportCardLeft: { flex: 1 },
  reportBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12, marginBottom: 4 },
  reportBadgeText: { fontSize: 10, fontWeight: '700' },
  reportName: { ...typography.bodyText, fontWeight: '600' },
  reportMetaText: { ...typography.captionText, color: colors.textSecondary },
  reportDate: { ...typography.captionText, color: colors.textSecondary },

  analyzingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  orbContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  orbRing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: colors.primarySaffron + '60' },
  orb: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySaffron + '20', justifyContent: 'center', alignItems: 'center' },
  orbIcon: { fontSize: 32 },
  stepIcon: { fontSize: 32, marginBottom: spacing.sm },
  analyzingTitle: { ...typography.headingSmall, textAlign: 'center', marginBottom: 4 },
  analyzingSubtitle: { ...typography.captionText, textAlign: 'center', color: colors.textSecondary },

  batchInfo: { ...typography.headingSmall, textAlign: 'center', paddingVertical: spacing.md, backgroundColor: colors.primaryGreen + '15', color: colors.primaryGreen },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  premiumCard: { backgroundColor: '#fff', borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md, elevation: 3 },
  formSectionTitle: { ...typography.headingSmall, color: colors.primaryGreen, marginBottom: spacing.md },
  fieldContainer: { marginBottom: spacing.md },
  label: { ...typography.captionText, color: colors.textSecondary, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.textSecondary + '20' },

  imageCard: { borderRadius: 16, overflow: 'hidden', marginBottom: spacing.md, height: 200 },
  previewImage: { width: '100%', height: '100%' },

  buttonRow: { marginTop: spacing.md },
  submitBtn: { flex: 1, marginBottom: spacing.md },
  retakeBtn: { alignItems: 'center' },
  retakeText: { ...typography.bodyText, color: colors.error, fontWeight: '600' },

  celebWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  celebTitle: { ...typography.headingLarge, marginVertical: spacing.sm },
  celebSubtitle: { ...typography.bodyText, textAlign: 'center', color: colors.textSecondary, marginBottom: spacing.xl },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryGreen + '15', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  detailLabel: { ...typography.captionText, color: colors.textPrimary, textTransform: 'uppercase', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  detailValue: { ...typography.bodyText },

  // ── Bottom Sheet header
  bsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md, paddingTop: spacing.md },
  bsSubtitle: { ...typography.captionText, color: colors.textSecondary, marginTop: 2 },
  bsCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.textSecondary + '15', justifyContent: 'center', alignItems: 'center' },

  // ── Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.primaryGreen, gap: spacing.sm },
  sectionHeaderIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  sectionHeaderText: { fontWeight: '800', letterSpacing: 0.6, fontSize: 15 },

  // ── Category pills
  categoryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  categoryPillText: { fontSize: 12, fontWeight: '700' },

  // ── Executive summary block
  summaryBlock: { backgroundColor: colors.cardBackground, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.textSecondary + '50' },
  summaryLabel: { ...typography.captionText, color: colors.textPrimary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  summaryText: { ...typography.bodyText, fontSize: 13, lineHeight: 20 },

  // ── Generic info card
  infoCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, elevation: 1, borderWidth: 1, borderColor: colors.textSecondary + '20', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },

  // ── Outer section wrapper card
  sectionCard: { backgroundColor: colors.cardBackground, borderRadius: 18, padding: spacing.md, marginBottom: spacing.lg, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.textSecondary + '15', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },

  // ── Urgency badge
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 5, alignSelf: 'flex-start', marginTop: 4 },
  urgencyDot: { width: 7, height: 7, borderRadius: 4 },
  urgencyBadgeText: { fontSize: 12, fontWeight: '800' },

  // ── Severity gauge
  gaugeCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  gaugeScore: { fontSize: 36, fontWeight: '900', color: colors.textPrimary, lineHeight: 40 },
  gaugeTotal: { ...typography.captionText, color: colors.textSecondary, alignSelf: 'flex-end', marginBottom: 4 },
  gaugeLabelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  gaugeLabelText: { fontSize: 11, fontWeight: '700' },
  gaugeTrack: { height: 10, backgroundColor: colors.textSecondary + '20', borderRadius: 5, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 5 },
  gaugeCaption: { ...typography.captionText, fontSize: 10, color: colors.textSecondary },

  // ── Population card
  popCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 14, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: '#1976D2' },
  popNumber: { fontSize: 24, fontWeight: '900', color: '#1976D2' },
  popLabel: { ...typography.captionText, color: '#1976D2', fontWeight: '600' },

  // ── Timeline card
  timelineCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  timelineCardTitle: { ...typography.captionText, fontSize: 12, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  timelineDot: { width: 13, height: 13, borderRadius: 7 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.primaryGreen + '40', minHeight: 36 },
  timelineStep: { ...typography.bodyText, fontSize: 13, lineHeight: 19 },
  timelineDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', borderRadius: 10, padding: spacing.sm, marginTop: spacing.sm },
  timelineDetailText: { ...typography.bodyText, color: '#1976D2', fontWeight: '700', fontSize: 13, flex: 1 },

  // ── Government scheme card (enhanced)
  schemeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  schemeIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1976D218', justifyContent: 'center', alignItems: 'center' },
  schemeLabel: { ...typography.captionText, fontSize: 9, color: '#0D47A1', fontWeight: '800', marginBottom: 2 },
  schemeDivider: { height: 1, backgroundColor: '#1976D220', marginVertical: spacing.sm },

  // ── AI card
  aiCard: { backgroundColor: '#E3F2FD', borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: '#1976D2' },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  aiCardIcon: { fontSize: 20 },
  aiCardTitle: { ...typography.headingSmall, color: '#0D47A1', fontSize: 16, fontWeight: '800' },
  aiSubLabel: { ...typography.captionText, fontSize: 9, color: '#0D47A1B0', fontWeight: '800', marginBottom: spacing.xs },

  // ── Solutions card
  solutionsCard: { backgroundColor: '#F3E5F5', borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: '#8E24AA' },
  solutionsTitle: { ...typography.captionText, fontSize: 10, fontWeight: '700', color: '#8E24AA', marginBottom: spacing.sm },
  solutionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  solutionBullet: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#8E24AA', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  solutionText: { ...typography.bodyText, flex: 1, fontSize: 13, lineHeight: 19 },

  // ── Bullet list
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },

  dropdownList: {
    marginTop: spacing.xs, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.textSecondary + '30',
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  dropdownItem: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '10' },
  dropdownItemActive: { backgroundColor: colors.primaryGreen + '10' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', paddingVertical: spacing.md, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20' },
  modalTitle: { ...typography.headingSmall, color: colors.primaryGreen },
  detailStepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, backgroundColor: colors.background, padding: spacing.md, borderRadius: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryGreen, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stepText: { ...typography.bodyText, flex: 1, fontSize: 14 },
  emptyText: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },

  // Week-by-week timeline row
  weekRow: { marginBottom: spacing.md, backgroundColor: colors.background, borderRadius: 12, overflow: 'hidden' },
  weekBadge: { backgroundColor: colors.primaryGreen, paddingHorizontal: spacing.md, paddingVertical: 6, alignSelf: 'flex-start', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  weekBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  weekContent: { padding: spacing.md, paddingTop: spacing.sm },

  // Info button (i)
  infoBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accentBlue + '20', borderWidth: 1, borderColor: colors.accentBlue + '60', justifyContent: 'center', alignItems: 'center' },
  infoBadgeText: { color: colors.accentBlue, fontSize: 10, fontWeight: '700', lineHeight: 13 },

  // Government scheme card
  schemeCard: { backgroundColor: '#1976D210', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: '#1976D2' },
  schemeName: { ...typography.bodyText, fontWeight: '800', color: '#0D47A1', flex: 1 },
  schemeReason: { ...typography.captionText, color: colors.textPrimary, lineHeight: 18, fontSize: 12 },
  
  premiumAudioContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryGreen + '20', marginTop: 10, marginBottom: 12 },
  audioPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryGreen, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 2 },
  citizenDescBox: { padding: spacing.md, backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.textSecondary + '20' },
  citizenDescText: { ...typography.bodyText, color: colors.textPrimary, marginTop: 4, lineHeight: 22 },
  attachmentImageWrapper: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.textSecondary + '20' },
  attachmentImage: { width: '100%', height: '100%' },
});

// Styles for field report viewer
const frStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.primaryGreen, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  bRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  bDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryGreen, marginTop: 6 },
  bText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
});
