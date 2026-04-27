import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../buttons/IconButton';
import { colors, spacing, typography } from '../../theme';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  rightIcon,
  onRightPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <View style={styles.leftContainer}>
          {showBack && (
            <IconButton
              iconName="arrow-left"
              onPress={onBackPress || (() => {})}
              style={styles.backButton}
              iconColor={colors.navyBlue}
            />
          )}
        </View>
        
        <Text style={[typography.headingSmall, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        
        <View style={styles.rightContainer}>
          {rightIcon && onRightPress && (
            <IconButton
              iconName={rightIcon as any}
              onPress={onRightPress}
              iconColor={colors.navyBlue}
            />
          )}
        </View>
      </View>
      <View style={styles.tricolorAccent}>
        <View style={[styles.barSegment, { backgroundColor: '#FF8C42' }]} />
        <View style={[styles.barSegment, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.barSegment, { backgroundColor: '#138808' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warmWhite,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
  },
  backButton: {
    marginLeft: -spacing.xs,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.navyBlue,
    fontWeight: '800',
    fontSize: 18,
  },
  tricolorAccent: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
  },
  barSegment: {
    flex: 1,
    height: '100%',
  },
});

