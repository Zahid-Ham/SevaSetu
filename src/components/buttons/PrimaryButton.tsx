import React, { useRef } from 'react';
import { 
  Text, 
  StyleSheet, 
  Animated, 
  Pressable, 
  StyleProp, 
  ViewStyle, 
  TextStyle,
  View
} from 'react-native';
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
  iconName
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed
        ]}
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
