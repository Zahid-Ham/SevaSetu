import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AppHeader, PrimaryButton, IconButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';

export const ScanSurveyScreen = () => {
  return (
    <View style={styles.container}>
      <AppHeader title="Scan & Survey" />
      <View style={styles.content}>
        <Text style={[typography.headingMedium, styles.title]}>Beneficiary Survey</Text>
        <Text style={[typography.bodyText, styles.subtitle]}>
          Scan a QR code ID or manually enter beneficiary details to start the survey.
        </Text>

        <View style={styles.scannerPlaceholder}>
          <IconButton iconName="maximize" size={48} iconColor={colors.primaryGreen} onPress={() => {}} />
          <Text style={[typography.captionText, styles.scannerText]}>Camera scanner will appear here</Text>
        </View>

        <PrimaryButton title="Manually Enter ID" onPress={() => {}} style={styles.manualBtn} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  scannerPlaceholder: {
    width: 250,
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primaryGreen,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    backgroundColor: colors.cardBackground,
  },
  scannerText: {
    marginTop: spacing.md,
  },
  manualBtn: {
    width: '100%',
    backgroundColor: colors.accentBlue,
  },
});
