import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80; // Decent size, not too large

type FeatherIconName = keyof typeof Feather.glyphMap;

const ICON_MAP: Record<string, FeatherIconName> = {
  Home: 'home',
  'Tasks Map': 'map',
  'Scan Survey': 'camera',
  Learning: 'book-open',
  Profile: 'user',
  Reports: 'file-text',
  'Report Issue': 'alert-circle',
  'My Requests': 'inbox',
  Passport: 'award',
  Dashboard: 'pie-chart',
  'Crisis Heatmap': 'map-pin',
  Volunteers: 'users',
  'Impact Reports': 'file-text',
  Settings: 'settings',
  Missions: 'target',
};

const AnimatedTabItem: React.FC<{
  label: string;
  isFocused: boolean;
  iconName: FeatherIconName;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ label, isFocused, iconName, onPress, onLongPress }) => {
  const scale = useSharedValue(isFocused ? 1 : 0.9);
  const translateY = useSharedValue(isFocused ? -2 : 0);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0.6);
  const labelScale = useSharedValue(isFocused ? 1 : 0.9);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.2 : 1, { damping: 15, stiffness: 300 });
    translateY.value = withSpring(isFocused ? -6 : 0, { damping: 15, stiffness: 300 });
    labelOpacity.value = withTiming(isFocused ? 1 : 0.7, { duration: 250 });
    labelScale.value = withSpring(isFocused ? 1.05 : 0.95, { damping: 15 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  const dotOpacity = useSharedValue(isFocused ? 1 : 0);
  React.useEffect(() => {
    dotOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
  }, [isFocused]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotOpacity.value }],
  }));

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconWrap, animatedStyle]}>
        <View
          style={[
            styles.iconBubble,
            isFocused && styles.iconBubbleFocused,
          ]}
        >
          <Feather
            name={iconName}
            size={22}
            color={isFocused ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
      </Animated.View>
      <Animated.Text 
        numberOfLines={1} 
        ellipsizeMode="tail"
        style={[styles.labelText, isFocused && styles.labelTextFocused, labelAnimatedStyle]}
      >
        {label}
      </Animated.Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </TouchableOpacity>
  );
};

/**
 * Custom animated tab bar using Reanimated.
 * Active tab icon scales up with spring, gets a colored bubble,
 * and an indicator dot below — all 60fps on the UI thread.
 */
export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container, 
      { 
        height: TAB_BAR_HEIGHT + insets.bottom, 
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingHorizontal: 12, // More space on the edges
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel as string) ?? route.name;
        const isFocused = state.index === index;
        const iconName: FeatherIconName = ICON_MAP[route.name] ?? 'circle';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <AnimatedTabItem
            key={route.key}
            label={label}
            isFocused={isFocused}
            iconName={iconName}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    height: TAB_BAR_HEIGHT,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    width: 44, // Slightly smaller to give text more room
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  iconBubbleFocused: {
    backgroundColor: colors.primarySaffron,
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primarySaffron,
    marginTop: 2,
  },
  labelText: {
    ...typography.captionText,
    fontSize: 10, // Compact but readable
    marginTop: 1,
    color: colors.textSecondary,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
  labelTextFocused: {
    color: colors.primarySaffron,
    fontWeight: '700',
  },
});
