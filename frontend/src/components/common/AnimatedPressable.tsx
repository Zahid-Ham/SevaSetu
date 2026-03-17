import React from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  haptic?: boolean;
  springConfig?: { damping?: number; stiffness?: number };
}

/**
 * A drop-in wrapper around Pressable that adds a buttery-smooth Reanimated
 * spring press effect + optional haptic feedback. Uses the UI thread for
 * zero jank.
 */
export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  style,
  children,
  haptic = true,
  springConfig,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, {
      damping: springConfig?.damping ?? 12,
      stiffness: springConfig?.stiffness ?? 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: springConfig?.damping ?? 12,
      stiffness: springConfig?.stiffness ?? 300,
    });
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
