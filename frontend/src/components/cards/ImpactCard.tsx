import { TouchableOpacity, View, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { DynamicText } from '../DynamicText';

interface ImpactCardProps {
  title: any;
  metric: any;
  date: any;
  imageUrl?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ImpactCard: React.FC<ImpactCardProps> = ({
  title,
  metric,
  date,
  imageUrl,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[globalStyles.card, styles.container, style]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImage]} />
      )}
      <View style={styles.content}>
        <DynamicText text={title} style={typography.headingSmall} numberOfLines={1} />
        <DynamicText text={metric} style={[typography.bodyText, styles.metric]} />
        <DynamicText text={date} style={typography.captionText} />
      </View>
    </TouchableOpacity>
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
