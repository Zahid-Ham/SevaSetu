import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors, spacing, typography, globalStyles } from '../../theme';

interface ImpactCardProps {
  title: string;
  metric: string;
  date: string;
  imageUrl?: string;
  style?: ViewStyle;
}

export const ImpactCard: React.FC<ImpactCardProps> = ({
  title,
  metric,
  date,
  imageUrl,
  style,
}) => {
  return (
    <View style={[globalStyles.card, styles.container, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImage]} />
      )}
      <View style={styles.content}>
        <Text style={typography.headingSmall} numberOfLines={1}>{title}</Text>
        <Text style={[typography.bodyText, styles.metric]}>{metric}</Text>
        <Text style={typography.captionText}>{date}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  placeholderImage: {
    backgroundColor: colors.textSecondary + '20',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  metric: {
    color: colors.primaryGreen,
    fontWeight: '600',
    marginVertical: spacing.xs,
  },
});
