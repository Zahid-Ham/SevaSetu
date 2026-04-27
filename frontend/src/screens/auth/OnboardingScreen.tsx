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
import * as Speech from 'expo-speech';
import { GradientBackground } from '../../components';

const { width, height } = Dimensions.get('window');

type AuthStackParamList = {
  OnboardingScreen: undefined;
  Landing: undefined;
};

type OnboardingNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OnboardingScreen'>;

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
      rate: 0.85,
      onDone: () => {
        if (currentIndex < ONBOARDING_SLIDES.length - 1) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true,
            });
          }, 1000);
        } else {
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
      <View style={styles.illustrationSection}>
        <View style={styles.circularImageContainer}>
          <Image
            source={item.image}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      </View>
      
      <View style={styles.contentSection}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        
        {currentIndex === 0 && !isPlaying && (
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={handleStartPresentation}
          >
            <Ionicons name="play" size={20} color="#FFF" />
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButtonTop}>
            <Text style={styles.skipTextTop}>छोड़ें (Skip)</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          scrollEnabled={!isPlaying}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          style={styles.flatList}
          contentContainerStyle={styles.flatListContent}
        />

        <View style={styles.footer}>
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
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 30 : 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  skipButtonTop: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFEBEE', // Very light red
    borderWidth: 1,
    borderColor: '#E5393530',
  },
  skipTextTop: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E53935', // Material Red
  },
  slide: {
    width: width,
    height: '100%',
    paddingHorizontal: spacing.xl,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
  },
  illustrationSection: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularImageContainer: {
    width: width * 0.82,
    height: width * 0.82,
    borderRadius: (width * 0.82) / 2,
    backgroundColor: '#FFFFFF',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Keep it clean
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    flex: 0.4,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  title: {
    ...typography.headingLarge,
    fontSize: 28,
    textAlign: 'center',
    color: colors.navyBlue,
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  description: {
    ...typography.bodyText,
    fontSize: 16,
    textAlign: 'center',
    color: colors.primarySaffron,
    fontWeight: '600',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  startButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primarySaffron,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 10 : 30,
    height: 100,
  },
  indicatorContainer: {
    flexDirection: 'row',
  },
  indicator: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: colors.primarySaffron,
    width: 20,
  },
  nextButton: {
    backgroundColor: colors.primaryGreen,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default OnboardingScreen;
