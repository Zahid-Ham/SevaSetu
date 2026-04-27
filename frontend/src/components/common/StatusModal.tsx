import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

const { width, height } = Dimensions.get('window');

interface StatusModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  visible,
  type,
  title,
  message,
  buttonText = 'Okay',
  onClose
}) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={60} color={colors.primaryGreen} />;
      case 'error':
        return <Ionicons name="alert-circle" size={60} color={colors.error} />;
      case 'info':
        return <Ionicons name="information-circle" size={60} color={colors.accentBlue} />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'success': return colors.primaryGreen;
      case 'error': return colors.error;
      case 'info': return colors.accentBlue;
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modalContainer}>
        <View style={[styles.topBar, { backgroundColor: getHeaderColor() }]} />
        
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: getHeaderColor() }]} 
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1001,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  iconContainer: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyText,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
