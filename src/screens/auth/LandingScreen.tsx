import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { typography, colors, spacing } from '../../theme';
import { MadeInIndiaBadge, GradientBackground } from '../../components';

const { width, height } = Dimensions.get('window');

export const LandingScreen = () => {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <GradientBackground showChakra={true}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <Text style={styles.logoText}>SevaSetu</Text>
          <Text style={styles.tagline}>Connecting Communities. Empowering Change.</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={styles.buttonShadow}
          onPress={() => navigation.navigate('RoleSelection')}
        >
          <LinearGradient
            colors={['#FF9C59', '#FF8C42']}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
        <MadeInIndiaBadge />
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    ...typography.headingSmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    padding: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
    alignItems: 'center',
  },
  buttonShadow: {
    width: '100%',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.headingMedium,
    color: colors.cardBackground,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
