/**
 * LanguageToggle.tsx
 * A premium animated pill-style toggle to switch between English and Hindi.
 * Designed to be dropped into any Profile or Settings screen.
 */
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { colors, spacing } from '../../theme';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const slideAnim = useRef(new Animated.Value(language === 'en' ? 0 : 1)).current;

  const toggle = async (lang: 'en' | 'hi') => {
    if (lang === language) return;
    await Haptics.selectionAsync();
    Animated.spring(slideAnim, {
      toValue: lang === 'en' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
    setLanguage(lang);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, PILL_WIDTH + 2],
  });

  const getPillColors = () => {
    return language === 'en' 
      ? [colors.primarySaffron, colors.saffronDeep] 
      : [colors.indiaGreen, '#1B5E20'];
  };

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {/* Sliding pill indicator */}
        <Animated.View style={[styles.slidingPill, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={getPillColors() as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pillGradient}
          />
        </Animated.View>

        {/* English Button */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => toggle('en')}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
            EN
          </Text>
        </TouchableOpacity>

        {/* Hindi Button */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => toggle('hi')}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, language === 'hi' && styles.optionTextActive]}>
            HI
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PILL_WIDTH = 48;

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 2,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  slidingPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: PILL_WIDTH,
    borderRadius: 28,
    overflow: 'hidden',
  },
  pillGradient: {
    flex: 1,
    borderRadius: 28,
  },
  option: {
    width: PILL_WIDTH,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: '#fff',
  },
});

