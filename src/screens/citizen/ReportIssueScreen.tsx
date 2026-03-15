import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { AppHeader, PrimaryButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

type IssueType = 'Water Shortage' | 'Food Assistance' | 'Medical Help' | 'Education' | 'Other';

const ISSUE_CATEGORIES: { label: IssueType, icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Water Shortage', icon: 'water' },
  { label: 'Food Assistance', icon: 'restaurant' },
  { label: 'Medical Help', icon: 'medical' },
  { label: 'Education', icon: 'book' },
  { label: 'Other', icon: 'ellipsis-horizontal-circle' },
];

const AnimatedSuccessIcon = () => {
  const scale = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
      <Ionicons name="checkmark" size={64} color={colors.cardBackground} />
    </Animated.View>
  );
};

export const ReportIssueScreen = () => {
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = () => {
    if (!selectedType) return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      // Reset after a while
      setTimeout(() => {
        setStatus('idle');
        setSelectedType(null);
        setDescription('');
      }, 4000);
    }, 1500); // simulate network request
  };

  if (status === 'success') {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <AnimatedSuccessIcon />
        <Text style={styles.successText}>Your report has been submitted successfully.</Text>
        <PrimaryButton 
          title="Report Another Issue" 
          onPress={() => { setStatus('idle'); setSelectedType(null); setDescription(''); }} 
          style={styles.backBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Report a Problem" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={[globalStyles.card, styles.promptCard]}>
          <Text style={typography.headingMedium}>What issue are you facing?</Text>
          <Text style={styles.subtitle}>Select the category that best fits the problem.</Text>
          
          <View style={styles.categoriesGrid}>
            {ISSUE_CATEGORIES.map((cat) => {
              const isSelected = selectedType === cat.label;
              return (
                <TouchableOpacity 
                  key={cat.label}
                  activeOpacity={0.7}
                  style={[styles.categoryBtn, isSelected && styles.categoryBtnSelected]}
                  onPress={() => setSelectedType(cat.label)}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={24} 
                    color={isSelected ? colors.cardBackground : colors.accentBlue} 
                  />
                  <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.mediaSection}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="camera-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="mic-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Voice Description</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="location-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Add Location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <Text style={typography.headingSmall}>Additional Details</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Type your description here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.submitContainer}>
          {status === 'loading' ? (
             <View style={styles.loadingContainer}>
               <ActivityIndicator size="large" color={colors.primarySaffron} />
               <Text style={styles.loadingText}>Submitting report...</Text>
             </View>
          ) : (
            <PrimaryButton 
              title="Submit Report" 
              onPress={handleSubmit} 
              style={[styles.submitBtn, !selectedType && styles.submitBtnDisabled]}
              disabled={!selectedType}
            />
          )}
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
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  promptCard: {
    margin: spacing.md,
    padding: spacing.lg,
  },
  subtitle: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBlue + '15', // 15% opacity soft background
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  categoryBtnSelected: {
    backgroundColor: colors.accentBlue,
  },
  categoryBtnText: {
    ...typography.bodyText,
    color: colors.accentBlue,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  categoryBtnTextSelected: {
    color: colors.cardBackground,
  },
  mediaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    backgroundColor: colors.cardBackground,
    flex: 1,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionBtnText: {
    ...typography.captionText,
    marginTop: spacing.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  textInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    height: 120,
    ...typography.bodyText,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
  },
  submitContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  submitBtn: {
    width: '100%',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.bodyText,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successText: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  backBtn: {
    width: '100%',
  },
});
