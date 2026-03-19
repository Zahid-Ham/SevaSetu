import React from 'react';
import { Modal, View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface FullImageViewerProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const FullImageViewer: React.FC<FullImageViewerProps> = ({ visible, imageUri, onClose }) => {
  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
        >
          <Feather name="x" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.tipText}>Pinch to zoom (Standard Browser Support)</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 10,
    padding: 10,
  },
  imageContainer: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  tipText: {
    ...typography.captionText,
    color: 'rgba(255,255,255,0.6)',
  }
});
