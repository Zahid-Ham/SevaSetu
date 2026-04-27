import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiConfig';
import { LinearGradient } from 'expo-linear-gradient';

export const VerifyPassportScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const navigation = useNavigation();
  const { t } = useLanguage();

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
      if (!data.startsWith('SEVA-PASS-')) {
        throw new Error(t('common.invalid') || 'Invalid passport QR code format.');
      }

      const response = await axios.get(`${API_BASE_URL}/auth/verify-passport/${data}`);
      
      if (response.data.success && response.data.citizen) {
        setResult(response.data.citizen);
      } else {
        throw new Error('Citizen not found.');
      }
    } catch (error: any) {
      Alert.alert(t('common.error') || 'Error', error.response?.data?.detail || error.message || 'Verification failed', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primarySaffron} /></View>;
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
      <AppHeader title={t('volunteer.recognition.verifyPassportTitle')} showBack onBackPress={() => navigation.goBack()} />
      
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
        <ScrollView style={styles.resultContainer} contentContainerStyle={{ paddingVertical: spacing.xl }}>
          <LinearGradient colors={['#FDF3E7', '#F5DEB3']} style={styles.resultCard}>
            <View style={styles.iconCircle}>
              <Feather name="user" size={32} color={colors.primarySaffron} />
            </View>
            <Text style={styles.successTitle}>{t('volunteer.recognition.verifiedCitizen')}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.passportDetails.name')}</Text>
              <Text style={styles.value}>{result.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.passportDetails.email')}</Text>
              <Text style={styles.value}>{result.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.passportDetails.role')}</Text>
              <Text style={styles.value}>{t(`auth.roles.${result.role}`) || result.role}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('volunteer.recognition.passportDetails.uniqueId')}</Text>
              <Text style={styles.value}>{`SEVA-PASS-${result.id.toUpperCase()}`}</Text>
            </View>
            
            <View style={styles.statusBox}>
                <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                <Text style={styles.statusBoxText}>{t('volunteer.recognition.identityConfirmed')}</Text>
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
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { ...typography.bodyText, textAlign: 'center', marginBottom: spacing.lg },
  btn: { backgroundColor: colors.primarySaffron, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  cameraContainer: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: colors.primarySaffron, backgroundColor: 'transparent' },
  overlayText: { color: '#fff', marginTop: spacing.xl, fontSize: 16, fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: spacing.md, fontSize: 16 },
  resultContainer: { flex: 1, padding: spacing.md },
  resultCard: { padding: spacing.xl, borderRadius: 16, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySaffron + '20', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primarySaffron, marginBottom: spacing.xl },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: spacing.xs },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success + '15', padding: spacing.md, borderRadius: 12, marginTop: spacing.lg, width: '100%', justifyContent: 'center' },
  statusBoxText: { marginLeft: 8, color: colors.success, fontWeight: 'bold', letterSpacing: 1 },
  scanAgainBtn: { marginTop: spacing.xxl, backgroundColor: colors.primarySaffron, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: 8 },
  scanAgainText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
