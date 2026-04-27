import React from 'react';
import {
  StyleSheet,
  Dimensions,
  StatusBar,
  View,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage } from '../../context/LanguageContext';
import { PrimaryButton, MadeInIndiaBadge } from '../../components';
import { colors } from '../../theme';

const { width, height } = Dimensions.get('window');

export const LandingScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Sharp, Focused Background Image */}
      <View style={styles.bgWrapper}>
        <Image 
          source={require('../../assets/images/landingpage2.jpeg')} 
          style={styles.backgroundImage} 
          resizeMode="cover"
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Transparent Spacer to push button down */}
          <View style={{ flex: 1 }} />

          <View style={styles.bottomSection}>
            <View style={styles.buttonContainer}>
              <PrimaryButton 
                title={t('auth.getStarted')} 
                onPress={() => navigation.navigate('RoleSelection')}
                style={styles.mainBtn}
              />
            </View>
            
            <View style={styles.footer}>
              <MadeInIndiaBadge />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bgWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 30,
    paddingBottom: 0,
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    alignItems: 'center',
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 10,
  },
  mainBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySaffron,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  footer: {
    alignItems: 'center',
    opacity: 0.9,
    marginBottom: 5,
  },
});

export default LandingScreen;