import React from 'react';
import { ScrollView, StyleSheet, View, Text, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppHeader, SectionTitle, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const ImpactPassportScreen = () => {

  const handleShare = () => {
    // Simulating a share popup
    Alert.alert(
      "Share Passport",
      "Sharing your unique Impact Passport...",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Share Now", onPress: () => console.log("Shared") }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Impact Passport" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Central Passport Card */}
        <View style={[globalStyles.card, styles.qrCard]}>
          <Text style={styles.citizenName}>Ramesh Kumar</Text>
          <Text style={styles.uniqueId}>ID: SEVA-2026-9482A</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value="SEVA-2026-9482A"
              size={180}
              color={colors.textPrimary}
              backgroundColor={colors.cardBackground}
            />
          </View>
          <Text style={styles.scanText}>Scan to verify citizen identity</Text>
        </View>

        {/* Aid History Section */}
        <SectionTitle title="Aid History" />
        <View style={styles.listContainer}>
          <View style={[globalStyles.card, styles.historyItem]}>
            <View style={styles.historyIconBox}>
              <Ionicons name="restaurant" size={20} color={colors.accentBlue} />
            </View>
            <View style={styles.historyTextContainer}>
              <Text style={typography.headingSmall}>Food Aid</Text>
              <Text style={styles.dateText}>March 2026</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>
          
          <View style={[globalStyles.card, styles.historyItem]}>
            <View style={styles.historyIconBox}>
              <Ionicons name="medical" size={20} color={colors.accentBlue} />
            </View>
            <View style={styles.historyTextContainer}>
              <Text style={typography.headingSmall}>Medical Camp</Text>
              <Text style={styles.dateText}>July 2026</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>

          <View style={[globalStyles.card, styles.historyItem]}>
            <View style={styles.historyIconBox}>
              <Ionicons name="book" size={20} color={colors.accentBlue} />
            </View>
            <View style={styles.historyTextContainer}>
              <Text style={typography.headingSmall}>Education Support</Text>
              <Text style={styles.dateText}>September 2026</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>
        </View>

        {/* Skills Section */}
        <SectionTitle title="Skills & Trades" />
        <View style={styles.skillsContainer}>
          <View style={styles.skillBadge}>
            <Text style={styles.skillText}>Construction</Text>
          </View>
          <View style={styles.skillBadge}>
             <Text style={styles.skillText}>Plumbing</Text>
          </View>
          <View style={styles.skillBadge}>
             <Text style={styles.skillText}>Tailoring</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton 
            title="Share Passport" 
            onPress={handleShare} 
            iconName="share-social-outline" 
          />
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  qrCard: {
    margin: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 4,
    borderTopColor: colors.primarySaffron,
  },
  citizenName: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  uniqueId: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    letterSpacing: 1,
    fontFamily: 'monospace', // Gives it a more ID-like quality if font isn't loaded
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanText: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentBlue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  historyTextContainer: {
    flex: 1,
  },
  dateText: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginTop: 2,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  skillBadge: {
    backgroundColor: colors.primaryGreen + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryGreen + '30',
  },
  skillText: {
    ...typography.bodyText,
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xxl,
  },
});
