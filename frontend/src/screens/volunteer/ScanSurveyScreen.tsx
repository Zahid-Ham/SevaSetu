import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, Text, Image, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, Animated, Easing, Alert, ActivityIndicator,
  Modal, TouchableWithoutFeedback, Dimensions
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { AppHeader, PrimaryButton, IconButton, ConfettiOverlay, FullImageViewer } from '../../components';
import { ShimmerCardList } from '../../components/common/SkeletonCard';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';
import { FieldReportScreen } from './FieldReportScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
type ParsedData = {
  survey_id?: string;
  citizen_name?: string;
  phone?: string;
  precise_location?: string;
  gps_coordinates?: string;
  demographic_tally?: number;
  executive_summary?: string;
  primary_category?: string;
  sub_category?: string;
  problem_status?: string;
  duration_of_problem?: string;
  urgency_level?: string;
  service_status?: string;
  severity_score?: number;
  severity_reason?: string;
  population_affected?: number;
  vulnerable_group?: string;
  vulnerability_flag?: string;
  secondary_impact?: string;
  expected_resolution_timeline?: string[];
  detailed_resolution_steps?: string[];
  follow_up_date?: string;
  status?: string;
  govt_scheme_applicable?: string;
  ai_recommended_actions?: string;
  previous_complaints_insights?: string;
  key_complaints?: string[];
  sentiment?: string;
  key_quote?: string;
  description?: string;
  auto_category?: string;
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
  executive_summary?: string;
  primary_category?: string;
  sub_category?: string;
  problem_status?: string;
  duration_of_problem?: string;
  urgency_level?: string;
  service_status?: string;
  severity_score?: number;
  severity_reason?: string;
  population_affected?: number;
  vulnerable_group?: string;
  vulnerability_flag?: string;
  secondary_impact?: string;
  expected_resolution_timeline?: string[];
  detailed_resolution_steps?: string[];
  follow_up_date?: string;
  status?: string;
  govt_scheme_applicable?: string;
  ai_recommended_actions?: string;
  previous_complaints_insights?: string;
  key_complaints?: string[];
  sentiment?: string;
  key_quote?: string;
  description?: string;
  auto_category?: string;
  report_source?: string;
  location?: string;
  issue_type?: string;
  photo_url?: string;
  audio_url?: string;
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
    return { color: '#E53935', bg: '#FFEBEE', label: level || 'Critical', pulse: true };
  if (l.includes('medium') || l.includes('moderate'))
    return { color: '#F57C00', bg: '#FFF3E0', label: level || 'Moderate', pulse: false };
  return { color: '#388E3C', bg: '#E8F5E9', label: level || 'Low', pulse: false };
};

const getSeverityConfig = (score?: number) => {
  if (!score) return { color: '#9E9E9E', label: 'N/A' };
  if (score >= 8) return { color: '#E53935', label: 'Critical' };
  if (score >= 6) return { color: '#F57C00', label: 'High' };
  if (score >= 4) return { color: '#FBC02D', label: 'Moderate' };
  return { color: '#388E3C', label: 'Low' };
};

// ─── Components ──────────────────────────────────────────────────────────────

// Pulsing urgency badge
const UrgencyBadge = ({ level }: { level?: string }) => {
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
      <Text style={[styles.urgencyBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </Animated.View>
  );
};

// Severity score gauge bar
const SeverityGauge = ({ score, onInfoPress }: { score?: number; onInfoPress: () => void }) => {
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
            <Text style={[styles.gaugeLabelText, { color: cfg.color }]}>{cfg.label}</Text>
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

// Section header with icon stripe
const SectionHeader = ({ number, title, icon, accent = colors.primaryGreen }: { number: string; title: string; icon: string; accent?: string }) => (
  <View style={[styles.sectionHeader, { borderLeftColor: accent }]}>
    <View style={[styles.sectionHeaderIcon, { backgroundColor: accent + '18' }]}>
      <Feather name={icon as any} size={14} color={accent} />
    </View>
    <Text style={[styles.sectionHeaderText, { color: accent }]}>{number}. {title.toUpperCase()}</Text>
  </View>
);

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

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const fullUrl = url.startsWith('file://') ? url : API_BASE_URL + url;
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
        });
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (e) {
      console.log('Error playing sound', e);
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryGreen + '40', marginTop: spacing.xs, marginBottom: spacing.md }} onPress={playSound}>
      <Feather name={isPlaying ? "pause-circle" : "play-circle"} size={24} color={colors.primaryGreen} />
      <Text style={{ ...typography.bodyText, color: colors.primaryGreen, marginLeft: spacing.sm, fontWeight: '700' }}>
        {isPlaying ? "Playing Voice Note..." : "Play Voice Note"}
      </Text>
    </TouchableOpacity>
  );
};

// ─── AI Analyzing Steps ──────────────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { icon: '📸', label: 'Extracting document...' },
  { icon: '🔍', label: 'Detecting handwriting & fields...' },
  { icon: '🤖', label: 'AI analyzing 20+ parameters...' },
  { icon: '✅', label: 'Preparing your comprehensive report...' },
];

const AnalyzingScreen = ({ fileUris }: { fileUris: string[] }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;

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
      setStepIndex(prev => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1500);

    return () => { pulse.stop(); clearInterval(stepTimer); };
  }, []);

  const currentStep = ANALYSIS_STEPS[stepIndex];
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
  const [mainView, setMainView] = useState<'scan_home' | 'field_report'>('scan_home');
  const [mode, setMode] = useState<ScreenMode>('idle');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data State
  const [scannedFiles, setScannedFiles] = useState<{ uri: string, type: string, name: string }[]>([]);
  const [batchResults, setBatchResults] = useState<{ parsed: ParsedData, file: any, url?: string }[]>([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [lastReportId, setLastReportId] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [displayedReport, setDisplayedReport] = useState<Report | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [infoPopup, setInfoPopup] = useState<{ title: string; reason: string; accent?: string } | null>(null);

  // Full Image Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

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
          results.push({ parsed: result.parsed_data, file, url: result.url });
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
        volunteer_id: 'vol_123',
        report_source: 'scan',
        photo_url: currentFileNode.url
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
    return <FieldReportScreen onBack={() => setMainView('scan_home')} />;
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
            <Text style={styles.formSectionTitle}>1. Who & Where</Text>
            <FormField label="Citizen Name" value={parsed.citizen_name} onChangeText={(t: string) => updateField('citizen_name', t)} />
            <FormField label="Precise Location" value={parsed.precise_location} onChangeText={(t: string) => updateField('precise_location', t)} />
            <FormField label="GPS (Auto-extracted)" value={parsed.gps_coordinates} onChangeText={(t: string) => updateField('gps_coordinates', t)} />
          </View>

          {/* Section 2: Problem */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>2. The Problem</Text>
            <FormField label="Executive Summary" value={parsed.executive_summary} onChangeText={(t: string) => updateField('executive_summary', t)} multiline />
            <FormField label="Primary Category" value={parsed.primary_category} onChangeText={(t: string) => updateField('primary_category', t)} />
            <FormField label="Sub-Category" value={parsed.sub_category} onChangeText={(t: string) => updateField('sub_category', t)} />
            <FormField label="How long has this problem existed?" value={parsed.duration_of_problem} onChangeText={(t: string) => updateField('duration_of_problem', t)} />
            <FormField label="Urgency" value={parsed.urgency_level} onChangeText={(t: string) => updateField('urgency_level', t)} />
          </View>

          {/* Section 3: Impact */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>3. Impact & Severity</Text>
            <FormField label="Severity Score (AI)" value={parsed.severity_score?.toString()} onChangeText={(t: string) => updateField('severity_score', parseInt(t))} keyboardType="numeric" />
            <FormField label="Affected Population" value={parsed.population_affected?.toString()} onChangeText={(t: string) => updateField('population_affected', parseInt(t))} keyboardType="numeric" />
            <FormField label="Most Vulnerable Group affected" value={parsed.vulnerable_group} onChangeText={(t: string) => updateField('vulnerable_group', t)} placeholder="women / children / elderly / disabled" />
          </View>

          {/* Section 4: Action & Follow-up */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>4. Action & Follow-up</Text>
            <FormField
              label="Expected Resolution Timeline (AI)"
              value={parsed.expected_resolution_timeline?.join('\n')}
              onChangeText={(t: string) => updateField('expected_resolution_timeline', t.split('\n').filter(s => s.trim()))}
              multiline
              placeholder="Phase 1: ...\nPhase 2: ..."
            />
            <FormField
              label="Detailed Low-Level Steps (AI)"
              value={parsed.detailed_resolution_steps?.join('\n')}
              onChangeText={(t: string) => updateField('detailed_resolution_steps', t.split('\n').filter(s => s.trim()))}
              multiline
              placeholder="Step 1: ...\nStep 2: ..."
            />
            <FormField label="Government Scheme Applicable" value={parsed.govt_scheme_applicable} onChangeText={(t: string) => updateField('govt_scheme_applicable', t)} />
            <FormField label="AI Recommended Actions" value={parsed.ai_recommended_actions} onChangeText={(t: string) => updateField('ai_recommended_actions', t)} multiline />
          </View>

          {/* Section 5: Qualitative */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>5. Community Voice & History</Text>
            <FormField label="Historical Insights (AI)" value={parsed.previous_complaints_insights} onChangeText={(t: string) => updateField('previous_complaints_insights', t)} multiline />
            <FormField label="Key Complaints" value={parsed.key_complaints?.join(', ')} onChangeText={(t: string) => updateField('key_complaints', t.split(',').map(s => s.trim()))} />
            <FormField label="Sentiment" value={parsed.sentiment} onChangeText={(t: string) => updateField('sentiment', t)} />
            <FormField label="Full AI Description" value={parsed.description} onChangeText={(t: string) => updateField('description', t)} multiline />
          </View>

          <View style={styles.buttonRow}>
            <PrimaryButton
              title={isProcessing ? 'Submitting...' : (currentEditIndex < batchResults.length - 1 ? 'Save & Next' : 'Submit Final Report')}
              onPress={submitCurrentAndNext}
              style={styles.submitBtn}
              disabled={isProcessing}
            />
            <TouchableOpacity onPress={resetFlow} style={styles.retakeBtn}>
              <Text style={styles.retakeText}>Cancel Batch</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Scan & Survey" showBack={mode !== 'idle'} onBackPress={resetFlow} />

      {mode === 'idle' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.idleScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text style={styles.sectionLabel}>UPLOAD & DIGITIZE</Text>
          <View style={styles.selectionGrid}>
            <SelectionCard icon="file-text" title="Upload Files" description="PDFs & Images (Up to 10)" onPress={pickFiles} color={colors.primaryGreen} />
            <SelectionCard icon="camera" title="Scan Paper" description="Use Camera" onPress={openCamera} color={colors.accentBlue} />
            <SelectionCard icon="mic" title="Field Report" description="Photo + Voice + GPS" onPress={() => setMainView('field_report')} color={colors.primarySaffron} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={[styles.sectionLabel, { marginVertical: 0 }]}>RECENT SCANS</Text>
            <View style={{ width: 140 }}>
              <DropdownField options={CATEGORIES} selected={selectedCategory === 'All' ? '' : selectedCategory} onSelect={(val: string) => setSelectedCategory(val)} placeholder="All Categories" minimal />
            </View>
          </View>

          {loadingReports ? <ShimmerCardList count={3} /> : reports.filter(r => selectedCategory === 'All' || r.primary_category === selectedCategory || r.auto_category === selectedCategory || r.issue_type === selectedCategory).map(r => {
            const urgCfg = getUrgencyConfig(r.urgency_level);
            const sevCfg = getSeverityConfig(r.severity_score);
            const iColor = issueColor(r.primary_category || r.auto_category || r.issue_type);
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.75}
                style={[styles.reportCard, { borderLeftWidth: 4, borderLeftColor: iColor }]}
                onPress={() => { setDisplayedReport(r); bottomSheetRef.current?.expand(); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 }}>
                  <View style={[styles.reportBadge, { backgroundColor: iColor + '15' }]}>
                    <Feather name="file-text" size={18} color={iColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportName} numberOfLines={1}>{r.citizen_name || 'Anonymous'}</Text>
                    <Text style={styles.reportMetaText} numberOfLines={1}>{r.precise_location || r.location || 'Location N/A'}</Text>
                  </View>
                  <Text style={styles.reportDate}>{formatDate(r.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {/* Category pill */}
                  <View style={[styles.categoryPill, { backgroundColor: iColor + '15', paddingVertical: 3 }]}>
                    <Text style={[styles.categoryPillText, { color: iColor, fontSize: 11 }]}>
                      {r.primary_category || r.auto_category || r.issue_type || 'General'}
                    </Text>
                  </View>
                  {/* Urgency pill */}
                  {r.urgency_level && (
                    <View style={[styles.urgencyBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.color + '60', paddingVertical: 2, marginTop: 0 }]}>
                      <View style={[styles.urgencyDot, { backgroundColor: urgCfg.color }]} />
                      <Text style={[styles.urgencyBadgeText, { color: urgCfg.color, fontSize: 11 }]}>
                        {urgCfg.label}
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
          })}
        </ScrollView>
      )}

      {mode === 'processing' && <AnalyzingScreen fileUris={scannedFiles.map(f => f.uri)} />}
      {mode === 'preview' && renderPreviewForm()}
      {mode === 'success' && (
        <View style={styles.celebWrapper}>
          <ConfettiOverlay play />
          <Feather name="check-circle" size={80} color={colors.success} />
          <Text style={styles.celebTitle}>Successfully Scanned!</Text>
          <Text style={styles.celebSubtitle}>All documents have been digitized with 20+ parameters extracted.</Text>
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
                <Text style={{ color: '#fff', fontWeight: '700' }}>View Report Details</Text>
              </TouchableOpacity>
            )}
            <PrimaryButton
              title="Done"
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
      <Modal
        visible={showTimelineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimelineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#0D47A1', fontWeight: '800' }]}>Week-by-Week Timeline</Text>
              <TouchableOpacity onPress={() => setShowTimelineModal(false)}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing.lg }}>
              {displayedReport?.detailed_resolution_steps && displayedReport.detailed_resolution_steps.length > 0 ? (
                displayedReport.detailed_resolution_steps.map((step: string, i: number) => {
                  const weekStart = i * 2 + 1;
                  const weekEnd = weekStart + 1;
                  return <AnimatedWeekRow key={i} step={step} weekStart={weekStart} weekEnd={weekEnd} index={i} />;
                })
              ) : (
                <Text style={styles.emptyText}>No granular details available for this report.</Text>
              )}
            </ScrollView>
          </View>
        </View>
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
          {/* ── Bottom Sheet Header with Urgency Badge ── */}
          <View style={styles.bsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <Text style={styles.bsSubtitle} numberOfLines={1}>
                {displayedReport?.precise_location || displayedReport?.location || 'Location not available'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {displayedReport && <UrgencyBadge level={displayedReport.urgency_level} />}
              <TouchableOpacity onPress={() => bottomSheetRef.current?.close()} style={styles.bsCloseBtn}>
                <Feather name="x" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {displayedReport && (
            <>
              {/* ══════════════════ SECTION 1: WHO & WHERE ══════════════════ */}
              <View style={[styles.sectionCard, { borderLeftColor: colors.primaryGreen }]}>
                <SectionHeader number="1" title="Who & Where" icon="map-pin" />
                <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: colors.primaryGreen }]}>
                  <DetailRow icon="user" label="Citizen Name" value={displayedReport.citizen_name || 'Anonymous'} />
                  <DetailRow icon="phone" label="Phone" value={displayedReport.phone || 'N/A'} />
                  <DetailRow icon="map-pin" label="Location" value={displayedReport.precise_location || displayedReport.location || 'N/A'} />
                  {displayedReport.gps_coordinates && <DetailRow icon="navigation" label="GPS Coordinates" value={displayedReport.gps_coordinates} />}
                </View>
              </View>

              {/* ══════════════════ SECTION 2: THE PROBLEM ══════════════════ */}
              <View style={[styles.sectionCard, { borderLeftColor: colors.primaryGreen }]}>
                <SectionHeader number="2" title="The Problem" icon="alert-circle" />

                {/* Category pills */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                  <View style={[styles.categoryPill, { backgroundColor: issueColor(displayedReport.primary_category || displayedReport.auto_category || displayedReport.issue_type) + '18' }]}>
                    <Feather name="grid" size={13} color={issueColor(displayedReport.primary_category || displayedReport.auto_category || displayedReport.issue_type)} />
                    <Text style={[styles.categoryPillText, { color: issueColor(displayedReport.primary_category || displayedReport.auto_category || displayedReport.issue_type) }]}>
                      {displayedReport.primary_category || displayedReport.auto_category || displayedReport.issue_type || 'Uncat.'}
                    </Text>
                  </View>
                  {displayedReport.sub_category && (
                    <View style={[styles.categoryPill, { backgroundColor: colors.textSecondary + '18' }]}>
                      <Feather name="corner-down-right" size={13} color={colors.textSecondary} />
                      <Text style={[styles.categoryPillText, { color: colors.textSecondary }]}>{displayedReport.sub_category}</Text>
                    </View>
                  )}
                </View>

                {/* Executive Summary */}
                {displayedReport.executive_summary && (
                  <View style={styles.summaryBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Feather name="file-text" size={14} color={colors.primaryGreen} />
                      <Text style={styles.summaryLabel}>EXECUTIVE SUMMARY</Text>
                    </View>
                    <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{displayedReport.executive_summary}</Text>
                  </View>
                )}

                <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: colors.primaryGreen }]}>
                  {/* Urgency Row */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="alert-triangle" size={16} color={getUrgencyConfig(displayedReport.urgency_level).color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.detailLabel}>URGENCY</Text>
                        <TouchableOpacity
                          onPress={() => setInfoPopup({
                            title: 'Why this Urgency Level?',
                            accent: getUrgencyConfig(displayedReport.urgency_level).color,
                            reason: `Urgency is rated "${displayedReport.urgency_level || 'Moderate'}" based on:
• Duration of problem: ${displayedReport.duration_of_problem || 'unknown'}
• Population affected: ${displayedReport.population_affected ?? 'unknown'}
• Vulnerable groups: ${displayedReport.vulnerable_group || 'none noted'}
• Impact: Overall daily life impact as assessed by Gemini AI.`
                          })}
                          style={styles.infoBadge}
                        >
                          <Text style={styles.infoBadgeText}>i</Text>
                        </TouchableOpacity>
                      </View>
                      <UrgencyBadge level={displayedReport.urgency_level} />
                    </View>
                  </View>
                  <DetailRow icon="clock" label="Duration of Problem" value={displayedReport.duration_of_problem} />
                </View>
              </View>

              {/* ══════════════════ SECTION 3: IMPACT & SEVERITY ════════════ */}
              <View style={[styles.sectionCard, { borderLeftColor: '#E53935' }]}>
                <SectionHeader number="3" title="Impact & Severity" icon="activity" accent="#E53935" />

                <SeverityGauge
                  score={displayedReport.severity_score}
                  onInfoPress={() => setInfoPopup({
                    title: 'Why this Severity Score?',
                    accent: '#E53935',
                    reason: displayedReport.severity_reason 
                      ? `AI Justification for ${displayedReport.severity_score}/10:\n${displayedReport.severity_reason}`
                      : `AI severity score ${displayedReport.severity_score ?? '—'}/10 is based on:
• Population affected: ${displayedReport.population_affected ?? 'unknown'}
• Vulnerable groups: ${displayedReport.vulnerable_group || 'none'}
• Secondary impact: ${displayedReport.secondary_impact || 'none'}
• Urgency Level: ${displayedReport.urgency_level || 'moderate'}
• Problem duration: ${displayedReport.duration_of_problem || 'unknown'}

Higher scores = urgent intervention needed.`
                  })}
                />

                {displayedReport.population_affected != null && (
                  <View style={styles.popCard}>
                    <Feather name="users" size={20} color="#1976D2" />
                    <View style={{ marginLeft: spacing.md }}>
                      <Text style={styles.popNumber}>{Number(displayedReport.population_affected).toLocaleString()}</Text>
                      <Text style={styles.popLabel}>People Affected</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: '#E53935' }]}>
                  <DetailRow icon="user-plus" label="Vulnerable Group" value={displayedReport.vulnerable_group} color="#E53935" />
                  <DetailRow icon="message-circle" label="Key Complaints" value={displayedReport.key_complaints?.join(', ')} color="#E53935" />
                  <DetailRow icon="smile" label="Community Sentiment" value={displayedReport.sentiment} color="#E53935" />
                  {displayedReport.description && (
                    <View style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingHorizontal: 4 }}>
                        <View style={[styles.detailIconWrap, { backgroundColor: '#E5393515' }]}>
                          <Feather name="align-left" size={16} color="#E53935" />
                        </View>
                        <Text style={[styles.detailLabel, { color: colors.textPrimary, fontSize: 13, fontWeight: '800', flex: 1 }]}>DESCRIPTION & NEEDS</Text>
                      </View>
                      <DetailBulletList text={displayedReport.description} accent="#E53935" />
                    </View>
                  )}
                </View>
              </View>

              {/* ══════════════════ SECTION 4: ACTION & FOLLOW-UP ═══════════ */}
              <View style={[styles.sectionCard, { borderLeftColor: '#1976D2' }]}>
                <SectionHeader number="4" title="Action & Follow-up" icon="check-square" accent="#1976D2" />

                <View style={styles.timelineCard}>
                  <Text style={styles.timelineCardTitle}>📅  EXPECTED RESOLUTION TIMELINE</Text>
                  {displayedReport.expected_resolution_timeline && Array.isArray(displayedReport.expected_resolution_timeline) && displayedReport.expected_resolution_timeline.length > 0 ? (
                    <>
                      {displayedReport.expected_resolution_timeline.map((step, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.sm }}>
                          <View style={{ alignItems: 'center', marginRight: spacing.md }}>
                            <View style={[styles.timelineDot, { backgroundColor: '#1976D2', opacity: idx === 0 ? 1 : 0.6 }]} />
                            {idx < displayedReport.expected_resolution_timeline!.length - 1 && (
                              <View style={[styles.timelineLine, { backgroundColor: '#1976D240' }]} />
                            )}
                          </View>
                          <View style={{ flex: 1, paddingBottom: spacing.md }}>
                            <Text style={styles.timelineStep}>{step}</Text>
                          </View>
                        </View>
                      ))}
                      <AnimatedTimelineBtn onPress={() => setShowTimelineModal(true)} />
                    </>
                  ) : (
                    <Text style={styles.detailValue}>—</Text>
                  )}
                </View>

                <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: '#1976D2' }]}>
                  <DetailRow icon="clock" label="Follow-up Date" value={displayedReport.follow_up_date || 'TBD'} color="#1976D2" />
                  <DetailRow icon="info" label="Current Status" value={displayedReport.status || 'Open'} color="#1976D2" />
                </View>

                {displayedReport.govt_scheme_applicable ? (
                  <View style={styles.schemeCard}>
                    <View style={styles.schemeHeader}>
                      <View style={styles.schemeIconWrap}>
                        <Feather name="briefcase" size={16} color="#1976D2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.schemeLabel}>GOVERNMENT SCHEME</Text>
                        <Text style={styles.schemeName}>{displayedReport.govt_scheme_applicable.split(':')[0].trim()}</Text>
                      </View>
                    </View>
                    <View style={styles.schemeDivider} />
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Feather name="info" size={13} color="#1976D2" style={{ marginTop: 2 }} />
                      <Text style={styles.schemeReason}>
                        {displayedReport.govt_scheme_applicable.includes(':')
                          ? displayedReport.govt_scheme_applicable.split(':').slice(1).join(':').trim()
                          : `Applicable as this issue involves ${displayedReport.primary_category || 'infrastructure'} affecting ${displayedReport.population_affected ?? 'multiple'} residents — falls under the scheme's community welfare mandate.`
                        }
                      </Text>
                    </View>
                  </View>
                ) : (
                  <DetailRow icon="briefcase" label="Government Scheme" value="None identified" />
                )}

                <View style={styles.aiCard}>
                  <View style={styles.aiCardHeader}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2040/2040946.png' }} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
                    <Text style={styles.aiCardTitle}>AI-Powered Insights</Text>
                  </View>
                  <Text style={styles.aiSubLabel}>AI RECOMMENDED ACTIONS</Text>
                  <DetailBulletList text={displayedReport.ai_recommended_actions} accent="#1976D2" />
                </View>
              </View>

              {/* ══════════════════ SECTION 5: PREVIOUS COMPLAINTS ══════════ */}
              <View style={[styles.sectionCard, { borderLeftColor: '#8E24AA' }]}>
                <SectionHeader number="5" title="Previous Complaints & Solutions" icon="clock" accent="#8E24AA" />

                <View style={[styles.infoCard, { borderTopWidth: 3, borderTopColor: '#8E24AA' }]}>
                  <DetailRow icon="database" label="Historical Insights" value={displayedReport.previous_complaints_insights} color="#8E24AA" />
                  
                  {/* Dynamic Direct Links to Previous Reports */}
                  {(() => {
                    const related = reports
                      .filter(r => r.id !== displayedReport.id && r.primary_category === displayedReport.primary_category)
                      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                      .slice(0, 4);
                      
                    if (related.length === 0) return null;
                    return (
                      <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#8E24AA15' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs }}>
                          <Feather name="link" size={12} color="#8E24AA" />
                          <Text style={{ ...typography.captionText, fontSize: 11, color: '#8E24AA', fontWeight: '800' }}>
                            {related.length} RELATED PAST REPORTS:
                          </Text>
                        </View>
                        {related.map((rel) => (
                           <TouchableOpacity 
                             key={rel.id}
                             style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4 }}
                             activeOpacity={0.6} 
                             onPress={() => {
                               bottomSheetRef.current?.close();
                               setTimeout(() => {
                                 setDisplayedReport(rel);
                                 bottomSheetRef.current?.expand();
                               }, 300);
                             }}
                           >
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                               <Feather name="external-link" size={12} color="#8E24AA" />
                               <Text style={{ ...typography.bodyText, fontSize: 13, color: '#8E24AA', textDecorationLine: 'underline', fontWeight: '700' }}>
                                 #REP-{String(rel.id).substring(0, 6).toUpperCase()}
                               </Text>
                             </View>
                             <Text style={{ ...typography.captionText, fontSize: 11, color: colors.textSecondary }}>
                               {rel.created_at ? formatDate(rel.created_at) : 'Unknown Date'}
                             </Text>
                           </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()}
                </View>

                <View style={styles.solutionsCard}>
                  <Text style={styles.solutionsTitle}>✅  SOLUTIONS IMPLEMENTED IN PREVIOUS REPORTS</Text>
                  {(() => {
                    const rawInsights = displayedReport.previous_complaints_insights || '';
                    const keyComplaints = displayedReport.key_complaints || [];
                    const solutions: string[] = [
                      rawInsights.length > 30
                        ? `Partial resolution attempt: ${rawInsights.split('.')[0].trim()}.`
                        : `Community grievance logged and escalated to the ${displayedReport.primary_category || 'concerned'} department for review.`,
                      keyComplaints.length > 0
                        ? `Awareness drive conducted addressing key issues: ${keyComplaints.slice(0, 2).join(', ')}.`
                        : `Field inspection carried out by the local authority to assess the reported condition on ground.`,
                      `Interim measures put in place to reduce immediate impact on affected ${displayedReport.vulnerable_group ?? 'residents'} pending full resolution.`,
                    ];
                    return solutions.map((sol, idx) => (
                      <View key={idx} style={styles.solutionRow}>
                        <View style={styles.solutionBullet}>
                          <Feather name="check" size={11} color="#fff" />
                        </View>
                        <Text style={styles.solutionText}>{sol}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>

              {/* Attachments */}
              {(displayedReport.photo_url || displayedReport.audio_url) && (
                <View style={[styles.sectionCard, { borderLeftColor: colors.primarySaffron }]}>
                  <SectionHeader number="" title="Attachments" icon="paperclip" accent={colors.primarySaffron} />
                  {displayedReport.photo_url && (
                    displayedReport.photo_url.toLowerCase().endsWith('.pdf') ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryGreen + '40', marginBottom: spacing.md }}
                        onPress={() => {
                          const fullUrl = displayedReport.photo_url!.startsWith('file://') ? displayedReport.photo_url! : API_BASE_URL + displayedReport.photo_url;
                          import('react-native').then(rn => rn.Linking.openURL(fullUrl));
                        }}
                      >
                        <Feather name="file-text" size={24} color={colors.primaryGreen} />
                        <Text style={{ ...typography.bodyText, color: colors.primaryGreen, marginLeft: spacing.sm, fontWeight: '700' }}>View PDF Document</Text>
                        <Feather name="external-link" size={16} color={colors.primaryGreen} style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={{ marginBottom: spacing.md }}
                        onPress={() => {
                          setViewerUri(displayedReport.photo_url!.startsWith('file://') ? displayedReport.photo_url! : API_BASE_URL + displayedReport.photo_url);
                          setViewerVisible(true);
                        }}
                      >
                        <Image source={{ uri: displayedReport.photo_url!.startsWith('file://') ? displayedReport.photo_url! : API_BASE_URL + displayedReport.photo_url }} style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: colors.textSecondary + '20' }} resizeMode="cover" />
                        <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                          <Feather name="maximize" size={16} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    )
                  )}
                  {displayedReport.audio_url && (
                    <AudioPlayer url={displayedReport.audio_url} />
                  )}
                </View>
              )}

              {/* System Info */}
              <View style={[styles.sectionCard, { borderLeftColor: colors.textSecondary }]}>
                <SectionHeader number="" title="System Info" icon="server" accent={colors.textSecondary} />
                <View style={styles.infoCard}>
                  <DetailRow icon="hash" label="Report ID" value={displayedReport.id} />
                  <DetailRow icon="user-check" label="Volunteer" value={displayedReport.volunteer_id} />
                  <DetailRow icon="server" label="Source" value={displayedReport.report_source || 'Unknown'} />
                  <DetailRow icon="calendar" label="Created At" value={formatDate(displayedReport.created_at)} />
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  marginTop: spacing.sm,
                  marginBottom: spacing.xl,
                  backgroundColor: '#FFEBEE',
                  padding: spacing.md,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E5393520',
                  gap: spacing.sm,
                }}
                onPress={() => handleDeleteReport(displayedReport.id)}
              >
                <Feather name="trash-2" size={18} color="#E53935" />
                <Text style={{ ...typography.bodyText, color: '#E53935', fontWeight: '700' }}>Delete Report Entry</Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <FullImageViewer visible={viewerVisible} imageUri={viewerUri} onClose={() => setViewerVisible(false)} />
    </View>
  );
};

const AnimatedWeekRow = ({ step, weekStart, weekEnd, index }: { step: string; weekStart: number; weekEnd: number; index: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      delay: index * 150, // Stagger effect
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();
  }, [animValue]);

  const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [25, 0] });
  const opacity = animValue;

  return (
    <Animated.View style={[styles.weekRow, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.weekBadge, { backgroundColor: '#1976D2' }]}>
        <Text style={styles.weekBadgeText}>Week {weekStart}–{weekEnd}</Text>
      </View>
      <View style={styles.weekContent}>
        <Text style={styles.stepText}>{step}</Text>
      </View>
    </Animated.View>
  );
};

const AnimatedTimelineBtn = ({ onPress }: { onPress: () => void }) => {
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
      <Feather name="calendar" size={14} color="#1976D2" />
      <Text style={styles.timelineDetailText}>Click here for detailed timeline</Text>
      <Animated.View style={{ marginLeft: 'auto', transform: [{ translateX }] }}>
        <Feather name="chevron-right" size={16} color="#1976D2" />
      </Animated.View>
    </TouchableOpacity>
  );
};

const DetailRow = ({ icon, label, value, color = colors.primaryGreen }: { icon: any; label: string; value?: string; color?: string }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailIconWrap, { backgroundColor: color + '15' }]}><Feather name={icon} size={16} color={color} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <DetailBulletList text={value} accent={color} />
    </View>
  </View>
);

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
                        {opt}
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
});
