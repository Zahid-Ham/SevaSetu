import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

export const globalStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12, // rounded corners
    padding: spacing.lg, // consistent padding
    // Soft shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Soft shadow for Android
    elevation: 3,
  },
});
