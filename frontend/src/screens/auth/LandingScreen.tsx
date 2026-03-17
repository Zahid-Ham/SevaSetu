import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  StatusBar,
  View,
  Text,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { MadeInIndiaBadge } from '../../components';

const { width, height } = Dimensions.get('window');

export const LandingScreen = () => {
  const navigation = useNavigation<any>();
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(buttonAnim, {
      toValue: 1,
      duration: 800,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/landingpage2.jpeg')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Spacer to push button to the bottom */}
      <View style={{ flex: 1 }} />

      {/* Bottom section: Get Started button + Made in India */}
      <Animated.View style={[styles.footer, { opacity: buttonAnim }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.buttonShadow}
          onPress={() => navigation.navigate('RoleSelection')}
        >
          <LinearGradient
            colors={['#FF9C45', '#FF7B1A']}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <MadeInIndiaBadge />
      </Animated.View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width,
    height,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  buttonShadow: {
    width: '100%',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});