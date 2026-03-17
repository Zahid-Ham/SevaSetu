import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

type AuthStackParamList = {
  SplashScreen: undefined;
  OnboardingScreen: undefined;
};

type SplashScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SplashScreen'>;

import { useAuthStore } from '../../services/store/useAuthStore';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { hasOnboarded } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // Navigation timer
    const timer = setTimeout(() => {
      if (hasOnboarded) {
        navigation.replace('Landing' as any);
      } else {
        navigation.replace('OnboardingScreen');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim, hasOnboarded]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Image 
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
  },
});

export default SplashScreen;
