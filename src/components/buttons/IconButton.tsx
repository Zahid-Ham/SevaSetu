import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface IconButtonProps {
  iconName: keyof typeof Feather.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
  iconColor?: string;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  onPress,
  style,
  iconColor = colors.textPrimary,
  size = 24,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
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
        style={styles.container}
      >
        <Feather name={iconName} size={size} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
