import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { spacing, typography } from '../../theme';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, style }) => {
  return (
    <Text style={[typography.headingSmall, styles.title, style]}>
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
});
