import React, { useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Text, Image, ScrollView, TextInput,
  ActivityIndicator, Alert, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { AppHeader, PrimaryButton, IconButton } from '../../components';
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

type ScreenMode = 'idle' | 'camera' | 'processing' | 'preview';

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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ScanSurveyScreen = () => {
  const [mode, setMode] = useState<ScreenMode>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  // Reports list
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = React.useMemo(() => ['55%', '85%'], []);

  const openReportDetail = (report: Report) => {
    setSelectedReport(report);
    bottomSheetRef.current?.expand();
  };

  const closeSheet = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => setSelectedReport(null), 300);
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
      // Small delay to ensure shimmer visibility on fast connections
      setTimeout(() => {
        setLoadingReports(false);
        setRefreshing(false);
      }, 800);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchReports(); };

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
      Alert.alert('Error', 'Failed to open camera or capture image');
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
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  // ── OCR + Gemini ──
  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', { uri, name: 'scan.jpg', type: 'image/jpeg' });

      console.log(`[Frontend] Processing image at: ${API_BASE_URL}/scan-form`);
      const response = await fetch(`${API_BASE_URL}/scan-form`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log(`[Frontend] Response status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setParsedData(result.parsed_data);
        setMode('preview');
      } else {
        throw new Error(result.detail || 'Failed to process form');
      }
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Analysis Failed', 'Could not read the form. Please try again.');
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
        Alert.alert('✅ Success', 'Report submitted!', [{ text: 'OK', onPress: resetFlow }]);
        fetchReports(); // refresh list after submission
      } else {
        throw new Error(result.detail || 'Submission failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
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
            {/* Selection cards */}
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

            {/* Reports history */}
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


      // ── PROCESSING ──
      case 'processing':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Analyzing document...</Text>
          </View>
        );

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
                <Text style={styles.formSubtitle}>Please ensure the AI correctly captured the details from your scan.</Text>
                
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
        onClose={closeSheet}
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
          {selectedReport && (
            <>
              <DetailRow icon="user" label="Citizen Name" value={selectedReport.citizen_name} />
              <DetailRow icon="phone" label="Phone" value={selectedReport.phone} />
              <DetailRow icon="map-pin" label="Location" value={selectedReport.location} />
              <DetailRow icon="alert-triangle" label="Issue Type" value={selectedReport.issue_type} />
              <DetailRow icon="file-text" label="Description" value={selectedReport.description} />
              <DetailRow icon="clock" label="Submitted At" value={formatDate(selectedReport.created_at)} />
              <DetailRow icon="hash" label="Report ID" value={selectedReport.id} />
            </>
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
  reportCardLeft: { flex: 1. },
  reportBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 20, marginBottom: 6 },
  reportBadgeText: { fontSize: 11, fontWeight: '700' },
  reportName: { ...typography.bodyText, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  reportMeta: { flexDirection: 'row', alignItems: 'center' },
  reportMetaText: { ...typography.captionText, color: colors.textSecondary, marginLeft: 4 },
  reportCardRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  reportDate: { ...typography.captionText, color: colors.textSecondary, marginBottom: 4 },

  emptyBox: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '80%', height: '60%',
    borderWidth: 2, borderColor: colors.primaryGreen, borderRadius: 12,
  },
  instructionText: { ...typography.bodyText, color: '#fff', marginTop: spacing.xl },
  controls: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  captureButton: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  // Processing
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  loadingText: { ...typography.bodyText, marginTop: spacing.lg, color: colors.textSecondary },

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
    backgroundColor: colors.background, // Contrast against card
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
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  detailIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryGreen + '15',
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  detailLabel: { ...typography.captionText, color: colors.textSecondary, marginBottom: 2, textTransform: 'uppercase', fontSize: 11 },
  detailValue: { ...typography.bodyText, color: colors.textPrimary },
});
