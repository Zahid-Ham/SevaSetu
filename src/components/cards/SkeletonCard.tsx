import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, spacing, globalStyles } from '../../theme';

interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [opacityAnim]);

  return (
    <View style={[globalStyles.card, styles.container, style]}>
      <View style={styles.headerRow}>
        <Animated.View style={[styles.skeletonBlock, styles.iconPlaceholder, { opacity: opacityAnim }]} />
        <View style={styles.textColumn}>
           <Animated.View style={[styles.skeletonBlock, styles.titlePlaceholder, { opacity: opacityAnim }]} />
           <Animated.View style={[styles.skeletonBlock, styles.subtitlePlaceholder, { opacity: opacityAnim }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  skeletonBlock: {
    backgroundColor: colors.textSecondary + '40', // light grey
    borderRadius: 8,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  titlePlaceholder: {
    height: 20,
    width: '70%',
    marginBottom: spacing.xs,
  },
  subtitlePlaceholder: {
    height: 14,
    width: '40%',
  },
});
