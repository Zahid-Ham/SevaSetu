import React from 'react';
import { Text, StyleSheet, View, ViewStyle } from 'react-native';
import { spacing, typography, colors } from '../../theme';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  accentBar: {
    width: 4,
    height: 18,
    backgroundColor: colors.primarySaffron,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.headingSmall,
    color: colors.navyBlue,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
