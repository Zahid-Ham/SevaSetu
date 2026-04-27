import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { certificateService } from '../../services/certificateService';
import { LinearGradient } from 'expo-linear-gradient';

export const VerifyCertificateScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const navigation = useNavigation();
  const { t, language } = useLanguage();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      // Expected URL format: https://sevasetu-web.web.app/verify/SEVA-2026-A1B2C
      let certId = data;
      if (data.includes('/verify/')) {
        certId = data.split('/verify/')[1].trim();
      }

      if (!certId.startsWith('SEVA-')) {
        throw new Error(t('common.invalid') || 'Invalid certificate QR code format.');
      }

      const verifiedData = await certificateService.verifyCertificate(certId);
      
      if (verifiedData.success && verifiedData.certificate) {
        setResult(verifiedData.certificate);
      } else {
        throw new Error(verifiedData.detail || 'Certificate not found.');
      }
    } catch (error: any) {
      Alert.alert(t('common.error') || 'Error', error.message || 'Verification failed', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primaryGreen} /></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('volunteer.recognition.cameraNoAccess')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={t('volunteer.recognition.verifyCertificate')} showBack onBackPress={() => navigation.goBack()} />
      
      {!result ? (
        <View style={styles.cameraContainer}>
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.overlayText}>{t('volunteer.recognition.pointCamera')}</Text>
          </View>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>{t('volunteer.recognition.verifying')}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <LinearGradient colors={['#FDF3E7', '#F5DEB3']} style={styles.resultCard}>
            <View style={styles.iconCircle}>
              <Feather name="check" size={32} color={colors.primaryGreen} />
            </View>
            <Text style={styles.successTitle}>{t('volunteer.recognition.verifiedAuthentic')}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.certNo')}:</Text>
              <Text style={styles.value}>{result.id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.awardedTo')}:</Text>
              <Text style={styles.value}>{language === 'hi' ? (result.volunteer_name_hi || result.volunteer_name) : result.volunteer_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{language === 'hi' ? 'श्रेणी' : 'Tier'}:</Text>
              <Text style={[styles.value, { color: '#CD7F32' }]}>{result.tier_label?.[language] || result.tier_label?.en || result.tier}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.issuedBy')}:</Text>
              <Text style={styles.value}>{result.ngo_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.issueDate')}:</Text>
              <Text style={styles.value}>{result.issue_date}</Text>
            </View>

            <TouchableOpacity 
              style={styles.scanAgainBtn} 
              onPress={() => {
                setResult(null);
                setScanned(false);
              }}
            >
              <Text style={styles.scanAgainText}>{t('volunteer.recognition.scanAnother')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { ...typography.bodyText, textAlign: 'center', marginBottom: spacing.lg },
  btn: { backgroundColor: colors.primaryGreen, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  cameraContainer: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: colors.primaryGreen, backgroundColor: 'transparent' },
  overlayText: { color: '#fff', marginTop: spacing.xl, fontSize: 16, fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: spacing.md, fontSize: 16 },
  resultContainer: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  resultCard: { padding: spacing.xxl, borderRadius: 16, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryGreen + '20', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primaryGreen, marginBottom: spacing.xl },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: spacing.xs },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  scanAgainBtn: { marginTop: spacing.xxl, backgroundColor: colors.primaryGreen, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: 8 },
  scanAgainText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
