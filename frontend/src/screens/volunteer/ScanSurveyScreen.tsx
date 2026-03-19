import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, Text, Image, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, Animated, Easing, Alert, ActivityIndicator,
  Modal, TouchableWithoutFeedback
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
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
  
  primary_category?: string;
  sub_category?: string;
  problem_status?: string;
  duration_of_problem?: string;
  urgency_level?: string;
  service_status?: string;

  severity_score?: number;
  population_affected?: number;
  vulnerability_flag?: string;
  secondary_impact?: string;

  key_complaints?: string[];
  sentiment?: string;
  key_quote?: string;
  description?: string;
  auto_category?: string;
  
  // Legacy
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
  primary_category?: string;
  sub_category?: string;
  problem_status?: string;
  duration_of_problem?: string;
  urgency_level?: string;
  service_status?: string;
  severity_score?: number;
  population_affected?: number;
  vulnerability_flag?: string;
  secondary_impact?: string;
  key_complaints?: string[];
  sentiment?: string;
  key_quote?: string;
  description?: string;
  auto_category?: string;
  report_source?: string;
  
  // Legacy
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

import { Audio } from 'expo-av';

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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ScanSurveyScreen = () => {
  const route = useRoute<any>();
  const [mainView, setMainView] = useState<'scan_home' | 'field_report'>('scan_home');
  const [mode, setMode] = useState<ScreenMode>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data State
  const [scannedFiles, setScannedFiles] = useState<{uri: string, type: string, name: string}[]>([]);
  const [batchResults, setBatchResults] = useState<{parsed: ParsedData, file: any, url?: string}[]>([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [lastReportId, setLastReportId] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [displayedReport, setDisplayedReport] = useState<Report | null>(null);

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
      const file = { uri: result.assets[0].uri, type: 'image/jpeg', name: 'scan.jpg'};
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

  const processBatch = async (files: {uri: string, type: string, name: string}[]) => {
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
            <FormField label="Primary Category" value={parsed.primary_category} onChangeText={(t: string) => updateField('primary_category', t)} />
            <FormField label="Sub-Category" value={parsed.sub_category} onChangeText={(t: string) => updateField('sub_category', t)} />
            <FormField label="Urgency" value={parsed.urgency_level} onChangeText={(t: string) => updateField('urgency_level', t)} />
          </View>

          {/* Section 3: Impact */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>3. Impact & Severity</Text>
            <FormField label="Severity Score (AI)" value={parsed.severity_score?.toString()} onChangeText={(t: string) => updateField('severity_score', parseInt(t))} keyboardType="numeric" />
            <FormField label="Affected Population" value={parsed.population_affected?.toString()} onChangeText={(t: string) => updateField('population_affected', parseInt(t))} keyboardType="numeric" />
          </View>

          {/* Section 4: Qualitative */}
          <View style={styles.premiumCard}>
            <Text style={styles.formSectionTitle}>4. Community Voice</Text>
            <FormField label="Key Complaints" value={parsed.key_complaints?.join(', ')} onChangeText={(t: string) => updateField('key_complaints', t.split(',').map(s=>s.trim()))} />
            <FormField label="Sentiment" value={parsed.sentiment} onChangeText={(t: string) => updateField('sentiment', t)} />
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

          {loadingReports ? <ShimmerCardList count={3} /> : reports.filter(r => selectedCategory === 'All' || r.primary_category === selectedCategory || r.auto_category === selectedCategory || r.issue_type === selectedCategory).map(r => (
            <TouchableOpacity key={r.id} style={styles.reportCard} onPress={() => { setDisplayedReport(r); bottomSheetRef.current?.expand(); }}>
              <View style={styles.reportCardLeft}>
                <View style={[styles.reportBadge, { backgroundColor: issueColor(r.primary_category || r.auto_category || r.issue_type) + '15' }]}>
                  <Feather name="file-text" size={20} color={issueColor(r.primary_category || r.auto_category || r.issue_type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportName} numberOfLines={1}>{r.citizen_name || 'Anonymous'}</Text>
                  <Text style={styles.reportMetaText} numberOfLines={1}>{r.precise_location || r.location}</Text>
                </View>
              </View>
              <Text style={styles.reportDate}>{formatDate(r.created_at)}</Text>
            </TouchableOpacity>
          ))}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingTop: spacing.md }}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <TouchableOpacity onPress={() => setDisplayedReport(null)}><Feather name="x" size={24} color={colors.textPrimary} /></TouchableOpacity>
          </View>
          {displayedReport && (
            <>
              {/* Who & Where */}
              <View style={{ marginTop: spacing.md, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', paddingBottom: 4 }}>
                <Text style={{ ...typography.captionText, color: colors.primaryGreen, fontWeight: '700', textTransform: 'uppercase' }}>1. Who & Where</Text>
              </View>
              <DetailRow icon="user" label="Citizen Name" value={displayedReport.citizen_name || 'Anonymous'} />
              <DetailRow icon="phone" label="Phone" value={displayedReport.phone || 'N/A'} />
              <DetailRow icon="map-pin" label="Location" value={displayedReport.precise_location || displayedReport.location || 'N/A'} />
              {displayedReport.gps_coordinates && <DetailRow icon="navigation" label="GPS" value={displayedReport.gps_coordinates} />}

              {/* Problem */}
              <View style={{ marginTop: spacing.md, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', paddingBottom: 4 }}>
                <Text style={{ ...typography.captionText, color: colors.primaryGreen, fontWeight: '700', textTransform: 'uppercase' }}>2. The Problem</Text>
              </View>
              <DetailRow icon="grid" label="Category" value={displayedReport.primary_category || displayedReport.auto_category || displayedReport.issue_type || 'Uncategorized'} />
              {displayedReport.sub_category && <DetailRow icon="corner-down-right" label="Sub Category" value={displayedReport.sub_category} />}
              <DetailRow icon="alert-triangle" label="Urgency" value={displayedReport.urgency_level || 'Moderate'} />
              <DetailRow icon="clock" label="Duration" value={displayedReport.duration_of_problem} />
              
              {/* Qualitative & Impact */}
              <View style={{ marginTop: spacing.md, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', paddingBottom: 4 }}>
                <Text style={{ ...typography.captionText, color: colors.primaryGreen, fontWeight: '700', textTransform: 'uppercase' }}>3. Impact & Feedback</Text>
              </View>
              <DetailRow icon="activity" label="Severity Score" value={displayedReport.severity_score !== undefined ? `${displayedReport.severity_score}/10` : '—'} />
              <DetailRow icon="users" label="Affected Pop." value={displayedReport.population_affected?.toString()} />
              <DetailRow icon="message-circle" label="Key Complaints" value={displayedReport.key_complaints?.join(', ')} />
              <DetailRow icon="smile" label="Sentiment" value={displayedReport.sentiment} />
              <DetailRow icon="file-text" label="Description" value={displayedReport.description || '—'} />

              {/* Attachments */}
              {(displayedReport.photo_url || displayedReport.audio_url) && (
                <View style={{ marginTop: spacing.md, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', paddingBottom: 4 }}>
                  <Text style={{ ...typography.captionText, color: colors.primaryGreen, fontWeight: '700', textTransform: 'uppercase' }}>4. Attachments</Text>
                </View>
              )}
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

              {/* System Info */}
              <View style={{ marginTop: spacing.md, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', paddingBottom: 4 }}>
                <Text style={{ ...typography.captionText, color: colors.primaryGreen, fontWeight: '700', textTransform: 'uppercase' }}>5. System Info</Text>
              </View>
              <DetailRow icon="hash" label="Report ID" value={displayedReport.id} />
              <DetailRow icon="user-check" label="Volunteer" value={displayedReport.volunteer_id} />
              <DetailRow icon="server" label="Source" value={displayedReport.report_source || 'Unknown'} />
              <DetailRow icon="calendar" label="Created At" value={formatDate(displayedReport.created_at)} />

              <TouchableOpacity 
                style={{ 
                  marginTop: spacing.xl, 
                  backgroundColor: colors.error + '15', 
                  padding: spacing.md, 
                  borderRadius: 12, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.error + '40'
                }}
                onPress={() => handleDeleteReport(displayedReport.id)}
              >
                <Feather name="trash-2" size={20} color={colors.error} />
                <Text style={{ ...typography.bodyText, color: colors.error, marginLeft: spacing.sm, fontWeight: '700' }}>Delete Report Entry</Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      <FullImageViewer 
        visible={viewerVisible} 
        imageUri={viewerUri} 
        onClose={() => setViewerVisible(false)} 
      />
    </View>
  );
};

const DetailRow = ({ icon, label, value }: { icon: any; label: string; value?: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}><Feather name={icon} size={16} color={colors.primaryGreen} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
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

const FormField = ({ label, value, onChangeText, keyboardType = 'default' }: any) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
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
  
  reportCard: { backgroundColor: colors.cardBackground, borderRadius: 12, padding: spacing.md, marginVertical: spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
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
  detailLabel: { ...typography.captionText, color: colors.textSecondary, textTransform: 'uppercase', fontSize: 10 },
  detailValue: { ...typography.bodyText },

  dropdownList: {
    marginTop: spacing.xs, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.textSecondary + '30',
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  dropdownItem: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '10' },
  dropdownItemActive: { backgroundColor: colors.primaryGreen + '10' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', paddingVertical: spacing.md, elevation: 5 },
  modalTitle: { ...typography.headingSmall, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', marginBottom: spacing.sm },
});
