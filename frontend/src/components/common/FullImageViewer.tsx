import React from 'react';
import { Modal, View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface FullImageViewerProps {
  visible: boolean;
  imageUri: string | null | undefined;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

export const FullImageViewer: React.FC<FullImageViewerProps> = ({ visible, imageUri, onClose }) => {
  return (
    <Modal
      visible={visible && !!imageUri}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop should capture touches that miss the image */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        {/* Image Container should not block the close button */}
        <View style={styles.imageContainer} pointerEvents="box-none">
          {imageUri && (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Close Button at the top level of the modal */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Feather name="x" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.footer} pointerEvents="none">
          <Text style={styles.tipText}>Tap anywhere to close</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 100,
  },
  tipText: {
    ...typography.captionText,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    letterSpacing: 0.5,
  }
});
