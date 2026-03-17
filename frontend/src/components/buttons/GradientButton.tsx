import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  colors?: string[];
  disabled?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  icon,
  style,
  textStyle,
  colors: gradientColors = ['#FF8C42', '#FFB066'],
  disabled = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 12, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <LinearGradient
          colors={(disabled ? ['#E0E0E0', '#BDBDBD'] : gradientColors) as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {icon && (
              <Feather
                name={icon}
                size={20}
                color="#FFF"
                style={styles.icon}
              />
            )}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    ...typography.bodyText,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
