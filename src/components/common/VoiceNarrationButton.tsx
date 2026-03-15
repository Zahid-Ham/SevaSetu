import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface VoiceNarrationButtonProps {
  text: string;
}

export const VoiceNarrationButton: React.FC<VoiceNarrationButtonProps> = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'hi-IN',
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSpeaking && styles.containerSpeaking]}
      onPress={handleSpeak}
    >
      <View style={styles.content}>
        {isSpeaking ? (
          <Ionicons name="stop" size={20} color={colors.primarySaffron} />
        ) : (
          <Ionicons name="volume-high" size={24} color="#FF8C42" />
        )}
        <Text style={[styles.label, isSpeaking && styles.labelSpeaking]}>
          {isSpeaking ? 'रुकें' : 'Listen'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  containerSpeaking: {
    borderColor: colors.primarySaffron,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#FF8C42',
  },
  labelSpeaking: {
    color: colors.primarySaffron,
  },
});
