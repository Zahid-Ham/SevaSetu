import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

export const globalStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.warmWhite,
    borderRadius: 16,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },

});
