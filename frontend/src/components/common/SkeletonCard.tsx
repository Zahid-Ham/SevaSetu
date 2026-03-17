import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SkeletonCardProps {
  rows?: number;
}

/**
 * Custom Shimmer Card built with expo-linear-gradient.
 * Avoids BVLinearGradient native module errors by using the Expo built-in.
 */
export const ShimmerCard: React.FC<SkeletonCardProps> = ({ rows = 3 }) => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const ShimmerLine = ({ width = '100%', height = 14, marginBottom = 8 }: any) => (
    <View style={[styles.lineWrapper, { width, height, marginBottom }]}>
      <AnimatedLinearGradient
        colors={['#EBEBEB', '#F5F5F5', '#EBEBEB']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] }
        ]}
      />
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ShimmerLine width={80} height={20} />
        <ShimmerLine width={60} height={16} />
      </View>
      <ShimmerLine width="60%" height={18} marginBottom={12} />
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerLine key={i} width={i % 2 === 0 ? '90%' : '75%'} />
      ))}
    </View>
  );
};

export const ShimmerCardList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <ShimmerCard key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.sm },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  lineWrapper: {
    backgroundColor: '#EBEBEB',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
