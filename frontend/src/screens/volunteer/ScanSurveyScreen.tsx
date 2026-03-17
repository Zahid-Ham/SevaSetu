import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, Text, Image, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, Animated, Easing, Alert,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { AppHeader, PrimaryButton, IconButton, ConfettiOverlay } from '../../components';
import { ShimmerCardList } from '../../components/common/SkeletonCard';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';

// ─── Types ────────────────────────────────────────────────────────────────────
type ParsedData = {
  name: string;
  phone: string;
  location: string;
  issue_type: string;
  description: string;
};

type Report = {
  id: string;
  citizen_name: string;
  phone: string;
  location: string;
  issue_type: string;
  description: string;
  volunteer_id: string;
  created_at: string;
};

type ScreenMode = 'idle' | 'processing' | 'preview' | 'success';

const ISSUE_COLORS: Record<string, string> = {
  'Water shortage': '#1976D2',
  'Electricity': '#F9A825',
  'Road damage': '#795548',
  'Sanitation': '#388E3C',
  'Medical': '#E53935',
};
const issueColor = (type: string) => ISSUE_COLORS[type] ?? colors.primarySaffron;

const formatDate = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};

// ─── AI Analyzing Steps ──────────────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { icon: '📸', label: 'Scanning image...' },
  { icon: '🔍', label: 'Detecting text & fields...' },
  { icon: '🤖', label: 'AI extracting information...' },
  { icon: '✅', label: 'Preparing your report...' },
];

// ─── Analyzing Screen ────────────────────────────────────────────────────────
const AnalyzingScreen = ({ imageUri }: { imageUri: string | null }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing ring animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    // Fade in the whole screen
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    pulse.start();

    // Step cycling
    const stepTimer = setInterval(() => {
      Animated.sequence([
        Animated.timing(stepFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(stepFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepIndex(prev => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1500);

    return () => {
      pulse.stop();
      clearInterval(stepTimer);
    };
  }, []);

  const currentStep = ANALYSIS_STEPS[stepIndex];

  return (
    <Animated.View style={[styles.analyzingContainer, { opacity: fadeAnim }]}>
      {/* Image thumbnail */}
      {imageUri && (
        <View style={styles.analyzingImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.analyzingImage} />
          <View style={styles.analyzingImageOverlay} />
          {/* Scanning line */}
          <ScanningLine />
        </View>
      )}

      {/* Pulsing AI orb */}
      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orbRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.orb}>
          <Text style={styles.orbIcon}>🤖</Text>
        </View>
      </View>

      {/* Step text */}
      <Animated.View style={{ opacity: stepFade, alignItems: 'center' }}>
        <Text style={styles.stepIcon}>{currentStep.icon}</Text>
        <Text style={styles.analyzingTitle}>{currentStep.label}</Text>
      </Animated.View>
      <Text style={styles.analyzingSubtitle}>Gemini AI is reading your document</Text>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {ANALYSIS_STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === stepIndex && styles.dotActive]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

// Thin animated scanning line
const ScanningLine = () => {
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
  return (
    <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
  );
};

// ─── Celebration Card ────────────────────────────────────────────────────────
const CelebrationCard = ({ parsedData, onDone }: { parsedData: ParsedData | null; onDone: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(checkAnim, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <Animated.View style={[styles.celebContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <ConfettiOverlay play />
      {/* Check circle */}
      <Animated.View style={[styles.celebCheck, { transform: [{ scale: checkAnim }] }]}>
        <Text style={styles.celebCheckIcon}>✓</Text>
      </Animated.View>

      <Text style={styles.celebTitle}>Report Submitted!</Text>
      <Text style={styles.celebSubtitle}>Your report has been recorded and sent to the supervisor.</Text>

      {/* Summary pill */}
      {parsedData && (
        <View style={styles.celebSummary}>
          <View style={styles.celebRow}>
            <Feather name="user" size={14} color={colors.primaryGreen} />
            <Text style={styles.celebRowText}>{parsedData.name || '—'}</Text>
          </View>
          <View style={styles.celebRow}>
            <Feather name="map-pin" size={14} color={colors.primaryGreen} />
            <Text style={styles.celebRowText}>{parsedData.location || '—'}</Text>
          </View>
          <View style={styles.celebRow}>
            <Feather name="alert-circle" size={14} color={colors.primarySaffron} />
            <Text style={[styles.celebRowText, { color: colors.primarySaffron }]}>{parsedData.issue_type || '—'}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.celebBtn} onPress={onDone} activeOpacity={0.85}>
        <Text style={styles.celebBtnText}>Report Another Issue</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ScanSurveyScreen = () => {
  const [mode, setMode] = useState<ScreenMode>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  // Reports list
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Bottom sheet - 'displayedReport' persists through close animation
  // clearTimeoutRef cancels stale clears when a new card is tapped quickly
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [displayedReport, setDisplayedReport] = useState<Report | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapPoints = React.useMemo(() => ['55%', '85%'], []);

  const openReportDetail = (report: Report) => {
    // Cancel any pending clear so stale timeouts don't wipe the new data
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    setDisplayedReport(report);
    setSelectedReport(report);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.expand();
    });
  };

  const scheduleClear = () => {
    clearTimeoutRef.current = setTimeout(() => {
      setDisplayedReport(null);
      setSelectedReport(null);
      clearTimeoutRef.current = null;
    }, 400);
  };

  const closeSheet = () => {
    bottomSheetRef.current?.close();
    scheduleClear();
  };

  // Fetch reports every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [])
  );

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports`);
      const json = await res.json();
      if (json.success) setReports(json.reports);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setTimeout(() => {
        setLoadingReports(false);
        setRefreshing(false);
      }, 800);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchReports(); };

  // ── Delete report ──
  const handleDeleteReport = (report: Report) => {
    Alert.alert(
      'Delete Report',
      `Are you sure you want to delete the report for "${report.citizen_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingReport(true);
            try {
              const res = await fetch(`${API_BASE_URL}/reports/${report.id}`, { method: 'DELETE' });
              const json = await res.json();
              if (json.success) {
                // Remove from local list immediately for instant UI feedback
                setReports(prev => prev.filter(r => r.id !== report.id));
                closeSheet();
              } else {
                Alert.alert('Error', json.detail || 'Failed to delete report.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Could not delete report.');
            } finally {
              setDeletingReport(false);
            }
          },
        },
      ]
    );
  };

  // ── Image capture ──
  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setScannedImage(uri);
        setMode('processing');
        processImage(uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setScannedImage(uri);
        setMode('processing');
        processImage(uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
    }
  };

  // ── OCR + Gemini ──
  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', { uri, name: 'scan.jpg', type: 'image/jpeg' });

      const response = await fetch(`${API_BASE_URL}/scan-form`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = await response.json();
      if (result.success) {
        setParsedData(result.parsed_data);
        setMode('preview');
      } else {
        throw new Error(result.detail || 'Failed to process form');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setMode('idle');
      setScannedImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!parsedData) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/submit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_name: parsedData.name,
          phone: parsedData.phone,
          location: parsedData.location,
          issue_type: parsedData.issue_type,
          description: parsedData.description,
          volunteer_id: 'vol_123',
        }),
      });
      const result = await response.json();
      if (result.success) {
        setMode('success'); // Show celebration card
        fetchReports();
      } else {
        throw new Error(result.detail || 'Submission failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFlow = () => {
    setMode('idle');
    setScannedImage(null);
    setParsedData(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (mode) {
      // ── IDLE: selection cards + report history ──
      case 'idle':
        return (
          <ScrollView
            contentContainerStyle={styles.idleScroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} />}
          >
            <Text style={styles.sectionLabel}>NEW SURVEY</Text>
            <View style={styles.selectionGrid}>
              <SelectionCard
                icon="camera"
                title="Open Camera"
                description="Capture form directly"
                onPress={openCamera}
                color={colors.primaryGreen}
              />
              <SelectionCard
                icon="image"
                title="From Gallery"
                description="Upload existing photo"
                onPress={pickImage}
                color={colors.accentBlue}
              />
            </View>

            <Text style={styles.sectionLabel}>
              PREVIOUS REPORTS ({reports.length})
            </Text>
            {loadingReports ? (
              <View style={{ marginTop: spacing.lg }}>
                <ShimmerCardList count={3} />
              </View>
            ) : reports.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="inbox" size={36} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No reports yet. Scan a form to get started!</Text>
              </View>
            ) : (
              reports.map((item) => (
                <ReportCard key={item.id} report={item} onPress={() => openReportDetail(item)} />
              ))
            )}
          </ScrollView>
        );

      // ── PROCESSING: Immersive AI Analyzing ──
      case 'processing':
        return <AnalyzingScreen imageUri={scannedImage} />;

      // ── PREVIEW / EDIT ──
      case 'preview':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {scannedImage && (
              <View style={styles.imageCard}>
                <Image source={{ uri: scannedImage }} style={styles.previewImage} />
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageTitle}>Scanned Document</Text>
                </View>
              </View>
            )}
            <View style={styles.formContainer}>
              <View style={styles.premiumCard}>
                <Text style={styles.formTitle}>Verify Information</Text>
                <Text style={styles.formSubtitle}>Ensure the AI correctly captured all details.</Text>

                <FormField label="Name" value={parsedData?.name || ''}
                  onChangeText={(t: string) => setParsedData(p => p ? { ...p, name: t } : null)} />
                <FormField label="Phone" value={parsedData?.phone || ''} keyboardType="phone-pad"
                  onChangeText={(t: string) => setParsedData(p => p ? { ...p, phone: t } : null)} />
                <FormField label="Location" value={parsedData?.location || ''}
                  onChangeText={(t: string) => setParsedData(p => p ? { ...p, location: t } : null)} />
                <FormField label="Issue Type" value={parsedData?.issue_type || ''}
                  onChangeText={(t: string) => setParsedData(p => p ? { ...p, issue_type: t } : null)} />
                <FormField label="Description" value={parsedData?.description || ''} multiline
                  onChangeText={(t: string) => setParsedData(p => p ? { ...p, description: t } : null)} />
              </View>

              <View style={styles.buttonRow}>
                <PrimaryButton
                  title={isProcessing ? 'Submitting...' : 'Confirm & Submit'}
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                  disabled={isProcessing}
                />
                <TouchableOpacity onPress={resetFlow} style={styles.retakeBtn} disabled={isProcessing}>
                  <Text style={styles.retakeText}>Discard & Retake</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );

      // ── SUCCESS: Celebration Card ──
      case 'success':
        return (
          <View style={styles.celebWrapper}>
            <CelebrationCard parsedData={parsedData} onDone={resetFlow} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Scan & Survey"
        showBack={mode !== 'idle'}
        onBackPress={resetFlow}
      />
      {renderContent()}

      {/* Bottom Sheet for Report Details */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={scheduleClear}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <TouchableOpacity onPress={closeSheet}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {/* Use displayedReport so content never disappears mid-animation */}
          {displayedReport ? (
            <>
              <DetailRow icon="user" label="Citizen Name" value={displayedReport.citizen_name} />
              <DetailRow icon="phone" label="Phone" value={displayedReport.phone} />
              <DetailRow icon="map-pin" label="Location" value={displayedReport.location} />
              <DetailRow icon="alert-triangle" label="Issue Type" value={displayedReport.issue_type} />
              <DetailRow icon="file-text" label="Description" value={displayedReport.description} />
              <DetailRow icon="clock" label="Submitted At" value={formatDate(displayedReport.created_at)} />
              <DetailRow icon="hash" label="Report ID" value={displayedReport.id} />

              {/* Delete button */}
              <View style={styles.deleteDivider} />
              <TouchableOpacity
                style={[styles.deleteBtn, deletingReport && { opacity: 0.6 }]}
                onPress={() => handleDeleteReport(displayedReport)}
                disabled={deletingReport}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={16} color="#fff" />
                <Text style={styles.deleteBtnText}>
                  {deletingReport ? 'Deleting...' : 'Delete Report'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.sheetPlaceholder}>
              <Text style={styles.sheetPlaceholderText}>Tap a report card to view details</Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const SelectionCard = ({ icon, title, description, onPress, color }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
      <IconButton iconName={icon} size={28} iconColor={color} onPress={onPress} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardDesc}>{description}</Text>
  </TouchableOpacity>
);

const ReportCard = ({ report, onPress }: { report: Report; onPress: () => void }) => (
  <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.reportCardLeft}>
      <View style={[styles.reportBadge, { backgroundColor: issueColor(report.issue_type) + '15' }]}>
        <Text style={[styles.reportBadgeText, { color: issueColor(report.issue_type) }]}>
          {report.issue_type || 'Unknown'}
        </Text>
      </View>
      <Text style={styles.reportName}>{report.citizen_name || 'Unknown'}</Text>
      <View style={styles.reportMeta}>
        <Feather name="map-pin" size={11} color={colors.textSecondary} />
        <Text style={styles.reportMetaText}>{report.location || '—'}</Text>
      </View>
    </View>
    <View style={styles.reportCardRight}>
      <Text style={styles.reportDate}>{formatDate(report.created_at)}</Text>
      <Feather name="chevron-right" size={18} color={colors.textSecondary} />
    </View>
  </TouchableOpacity>
);

const FormField = ({ label, value, onChangeText, multiline = false, keyboardType = 'default' }: any) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      placeholder={`Enter ${label}`}
      keyboardType={keyboardType}
    />
  </View>
);

const DetailRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Feather name={icon} size={15} color={colors.primaryGreen} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Idle
  idleScroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  sectionLabel: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  selectionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary + '20',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  iconWrapper: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.headingSmall, fontSize: 14, textAlign: 'center', color: colors.textPrimary, marginBottom: 4 },
  cardDesc: { ...typography.captionText, textAlign: 'center', color: colors.textSecondary },

  // Report card
  reportCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  reportCardLeft: { flex: 1 },
  reportBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 20, marginBottom: 6 },
  reportBadgeText: { fontSize: 11, fontWeight: '700' },
  reportName: { ...typography.bodyText, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  reportMeta: { flexDirection: 'row', alignItems: 'center' },
  reportMetaText: { ...typography.captionText, color: colors.textSecondary, marginLeft: 4 },
  reportCardRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  reportDate: { ...typography.captionText, color: colors.textSecondary, marginBottom: 4 },

  emptyBox: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },

  // ── Analyzing Screen ──
  analyzingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  analyzingImageWrap: {
    width: '80%',
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
    marginBottom: spacing.md,
  },
  analyzingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.7,
  },
  analyzingImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primaryGreen,
    opacity: 0.9,
    shadowColor: colors.primaryGreen,
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  orbContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.primarySaffron + '60',
  },
  orb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySaffron + '20',
    borderWidth: 2,
    borderColor: colors.primarySaffron,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbIcon: { fontSize: 28 },
  stepIcon: { fontSize: 24, marginBottom: 4 },
  analyzingTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  analyzingSubtitle: {
    ...typography.captionText,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary + '40',
  },
  dotActive: {
    backgroundColor: colors.primarySaffron,
    width: 20,
  },

  // ── Celebration Card ──
  celebWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  celebContainer: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 12,
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  celebCheck: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  celebCheckIcon: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  celebTitle: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontSize: 24,
  },
  celebSubtitle: {
    ...typography.bodyText,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  celebSummary: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  celebRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  celebRowText: {
    ...typography.bodyText,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  celebBtn: {
    backgroundColor: colors.primarySaffron,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 50,
    elevation: 4,
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  celebBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Preview / form
  scrollContent: { paddingBottom: spacing.xxl },
  imageCard: {
    margin: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  previewImage: { width: '100%', height: 250, resizeMode: 'cover', opacity: 0.9 },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.4)'
  },
  imageTitle: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  formContainer: { paddingHorizontal: spacing.lg },
  premiumCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: spacing.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formTitle: { ...typography.headingMedium, color: colors.textPrimary, marginBottom: 4 },
  formSubtitle: { ...typography.captionText, color: colors.textSecondary, marginBottom: spacing.xl },
  fieldContainer: { marginBottom: spacing.lg },
  label: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.textSecondary + '20',
    ...typography.bodyText,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  buttonRow: { marginTop: spacing.xl, marginBottom: spacing.xl },
  submitBtn: { width: '100%' },
  retakeBtn: { marginTop: spacing.lg, alignItems: 'center' },
  retakeText: { ...typography.bodyText, color: colors.error, fontWeight: '600' },

  // Bottom sheet
  sheetBackground: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: colors.textSecondary + '40', width: 40, height: 4, borderRadius: 2 },
  sheetContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.md },
  modalTitle: { ...typography.headingMedium, color: colors.textPrimary },
  sheetPlaceholder: { alignItems: 'center', paddingVertical: spacing.xxl },
  sheetPlaceholderText: { ...typography.captionText, color: colors.textSecondary },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  detailIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryGreen + '15',
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  detailLabel: { ...typography.captionText, color: colors.textSecondary, marginBottom: 2, textTransform: 'uppercase', fontSize: 11 },
  detailValue: { ...typography.bodyText, color: colors.textPrimary },

  // Delete button in sheet
  deleteDivider: {
    height: 1,
    backgroundColor: colors.textSecondary + '20',
    marginVertical: spacing.lg,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    elevation: 3,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
