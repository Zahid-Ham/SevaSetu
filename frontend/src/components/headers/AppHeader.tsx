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
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    marginLeft: -spacing.sm,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
