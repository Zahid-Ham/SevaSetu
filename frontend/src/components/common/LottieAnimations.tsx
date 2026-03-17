import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors, typography, spacing } from '../../theme';

interface LottieSuccessProps {
  message?: string;
  size?: number;
}

/**
 * Full-page success state with a Lottie checkmark animation.
 * Replaces the basic AnimatedSuccessIcon on the ReportIssueScreen.
 */
export const LottieSuccess: React.FC<LottieSuccessProps> = ({
  message = 'Your report has been submitted successfully.',
  size = 180,
}) => {
  const animRef = useRef<LottieView>(null);

  useEffect(() => {
    animRef.current?.play();
  }, []);

  return (
    <View style={styles.container}>
      <LottieView
        ref={animRef}
        source={require('../../assets/lottie/success.json')}
        style={{ width: size, height: size }}
        autoPlay
        loop={false}
        speed={1.2}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

interface LottieLoadingProps {
  message?: string;
  size?: number;
}

/**
 * Inline loading indicator using animated saffron dots.
 * Replaces ActivityIndicator for a consistent branded look.
 */
export const LottieLoading: React.FC<LottieLoadingProps> = ({
  message = 'Submitting report...',
  size = 100,
}) => {
  return (
    <View style={styles.loadingContainer}>
      <LottieView
        source={require('../../assets/lottie/loading.json')}
        style={{ width: size, height: size }}
        autoPlay
        loop
        speed={1}
      />
      {message ? <Text style={styles.loadingText}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 28,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
