import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, globalStyles } from '../../theme';

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
        <Text style={[typography.headingSmall, styles.title]} numberOfLines={1}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: getUrgencyColor() + '20' }]}>
          <Text style={[styles.badgeText, { color: getUrgencyColor() }]}>{urgency}</Text>
        </View>
      </View>
      
      <Text style={[typography.bodyText, styles.description]} numberOfLines={2}>
        {description}
      </Text>
      
      <View style={styles.footer}>
        <Feather name="map-pin" size={14} color={colors.textSecondary} />
        <Text style={[typography.captionText, styles.location]}>{location}</Text>
      </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
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
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    ...typography.captionText,
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: spacing.xs,
  },
});
