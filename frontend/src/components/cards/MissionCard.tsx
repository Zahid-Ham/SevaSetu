import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { DynamicText } from '../DynamicText';

interface MissionCardProps {
  title: string;
  description: string;
  location: string;
  urgency: 'Low' | 'Medium' | 'High';
  onPress: () => void;
  style?: ViewStyle;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  title,
  description,
  location,
  urgency,
  onPress,
  style,
}) => {
  const getUrgencyColor = () => {
    switch (urgency) {
      case 'High': return colors.error;
      case 'Medium': return colors.warning;
      case 'Low': return colors.success;
      default: return colors.primaryGreen;
    }
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress} 
        style={[globalStyles.card, styles.container]}
      >
      <View style={styles.header}>
        <DynamicText text={title} style={[typography.headingSmall, styles.title]} numberOfLines={1} />
        <View style={[styles.badge, { backgroundColor: getUrgencyColor() + '20' }]}>
          <DynamicText text={urgency} style={[styles.badgeText, { color: getUrgencyColor() }]} />
        </View>
      </View>
      
      <DynamicText text={description} style={[typography.bodyText, styles.description]} numberOfLines={2} />
      
      <View style={styles.footer}>
        <Feather name="map-pin" size={14} color={colors.textSecondary} />
        <DynamicText text={location} style={[typography.captionText, styles.location]} />
      </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    backgroundColor: colors.warmWhite,
    borderLeftWidth: 4,
    borderLeftColor: colors.primarySaffron,
    padding: spacing.lg,
    borderRadius: 16,
    // Add specific border radius for the left border accent
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
    color: colors.navyBlue,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: spacing.sm,
  },
  location: {
    marginLeft: spacing.xs,
    color: colors.indiaGreen,
    fontWeight: '600',
  },
});

