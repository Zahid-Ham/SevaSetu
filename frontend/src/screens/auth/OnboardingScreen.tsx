import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  SafeAreaView,
  Animated,
  Easing,
  StatusBar,
  ViewToken,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { ONBOARDING_SLIDES, OnboardingSlide } from '../../constants/onboardingSlides';
import { useAuthStore } from '../../services/store/useAuthStore';

const { width, height } = Dimensions.get('window');

type AuthStackParamList = {
  OnboardingScreen: undefined;
  Landing: undefined;
};

type OnboardingNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OnboardingScreen'>;

import * as Speech from 'expo-speech';
import { GradientBackground } from '../../components';

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const { completeOnboarding } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-narration and paging logic
  useEffect(() => {
    if (isPlaying) {
      speakCurrentSlide();
    }
    return () => {
      Speech.stop();
    };
  }, [currentIndex, isPlaying]);

  const speakCurrentSlide = () => {
    const slide = ONBOARDING_SLIDES[currentIndex];
    const speechText = `${slide.title}. ${slide.description}`;
    
    Speech.speak(speechText, {
      language: 'hi-IN',
      rate: 0.85, // Slightly slower for better clarity
      onDone: () => {
        if (currentIndex < ONBOARDING_SLIDES.length - 1) {
          // Automatic delay before switching to next slide
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true,
            });
          }, 1000);
        } else {
          // Final slide finished
          setTimeout(() => {
            handleComplete();
          }, 1500);
        }
      },
    });
  };

  const handleStartPresentation = () => {
    setIsPlaying(true);
  };

  const handleComplete = () => {
    Speech.stop();
    completeOnboarding();
    navigation.navigate('Landing');
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      {/* Top Space to avoid collision */}
      <View style={styles.topSpace} />

      {/* Center Section: Illustration */}
      <View style={styles.illustrationSection}>
        <View style={styles.circularImageContainer}>
          <Image
            source={item.image}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      </View>
      
      {/* Bottom Section: Content */}
      <View style={styles.contentSection}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        
        {currentIndex === 0 && !isPlaying && (
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={handleStartPresentation}
          >
            <Ionicons name="play" size={24} color="#FFF" />
            <Text style={styles.startButtonText}>कहानी शुरू करें</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <GradientBackground variant="onboarding">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          scrollEnabled={!isPlaying} // Disable manual swipe while playing presentation
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1 }}
        />

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>छोड़ें</Text>
          </TouchableOpacity>

          <View style={styles.indicatorContainer}>
            {ONBOARDING_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentIndex === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === ONBOARDING_SLIDES.length - 1 ? 'शुरू करें' : 'आगे बढ़ें'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  slide: {
    width: width,
    height: height,
    paddingHorizontal: spacing.xl,
  },
  topSpace: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 40,
    width: '100%',
  },
  slideHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.lg,
    zIndex: 10,
  },
  illustrationSection: {
    flex: 0.45, // Balanced for center illustration
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularImageContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    borderWidth: 6,
    borderColor: '#FFF',
    overflow: 'hidden',
    backgroundColor: '#FFF1ED',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
  },
  startButton: {
    marginTop: spacing.xl,
    backgroundColor: '#FF8C42',
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    color: '#1A237E', // Navy Blue for Title
    lineHeight: 40,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    color: '#FF8C42', // Saffron for Description
    fontWeight: '600',
    lineHeight: 26,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    position: 'absolute',
    bottom: 20, // Lifted up to avoid collision
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl, // Additional padding for safety
  },
  skipButton: {
    paddingVertical: spacing.md,
  },
  skipText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#BDBDBD',
  },
  indicatorContainer: {
    flexDirection: 'row',
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: '#FF8C42',
    width: 22,
  },
  nextButton: {
    backgroundColor: '#2E7D32', // Green for action button
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
    elevation: 4,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default OnboardingScreen;
