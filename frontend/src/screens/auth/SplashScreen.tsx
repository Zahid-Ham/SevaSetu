import React, { useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../services/store/useAuthStore';

const { width } = Dimensions.get('window');

type AuthStackParamList = {
  SplashScreen: undefined;
  OnboardingScreen: undefined;
};

type SplashScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SplashScreen'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { hasOnboarded } = useAuthStore();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    // Logo entrance animation using Reanimated (UI thread)
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Navigation timer
    const timer = setTimeout(() => {
      if (hasOnboarded) {
        navigation.replace('Landing' as any);
      } else {
        navigation.replace('OnboardingScreen');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigation, hasOnboarded]);

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
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
