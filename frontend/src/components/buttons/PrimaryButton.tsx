import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  iconName,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={() => [styles.button, disabled && styles.disabled]}
      >
        <View style={styles.contentRow}>
          {iconName && (
            <Ionicons name={iconName} size={20} color={colors.cardBackground} style={styles.icon} />
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primarySaffron,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    ...typography.headingSmall,
    color: colors.cardBackground,
    fontWeight: '700',
  },
});
