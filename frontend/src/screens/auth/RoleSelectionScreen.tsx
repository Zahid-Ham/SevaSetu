import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  Pressable 
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { MadeInIndiaBadge, GradientBackground, AshokaChakra } from '../../components';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';

type RoleCardProps = {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  index: number;
  accentColor: string;
};

const AnimatedRoleCard: React.FC<RoleCardProps> = ({ 
  title, 
  description, 
  iconName, 
  onPress, 
  index,
  accentColor 
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(200 + index * 150).springify().damping(12)}
      style={styles.cardWrapper}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[styles.roleCard, { borderLeftColor: accentColor }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
            <Ionicons name={iconName} size={32} color={accentColor} />
          </View>
          <View style={styles.cardHeader}>
            <Text style={styles.roleTitle}>{title}</Text>
            <Text style={styles.roleDesc}>{description}</Text>
          </View>
          <View style={[styles.arrowContainer, { backgroundColor: accentColor + '10' }]}>
            <Ionicons name="chevron-forward" size={18} color={accentColor} />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export const RoleSelectionScreen = () => {
  const { t, language } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const navigateToLogin = (role: string) => {
    navigation.navigate('Login', { role });
  };

  return (
    <GradientBackground style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <AshokaChakra size={40} color="#FFFFFF" opacity={0.9} />
              <Text style={styles.brandText}>SevaSetu</Text>
            </View>
            <LanguageToggle />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {t('auth.identifyRole')}
            </Text>
            <Text style={styles.subtitle}>
              {t('auth.selectRoleDesc')}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        <AnimatedRoleCard 
          index={0}
          title={t('auth.citizen')}
          description={t('auth.roleCitizenDesc')}
          iconName="people-outline"
          accentColor={colors.primarySaffron}
          onPress={() => navigateToLogin('CITIZEN')}
        />

        <AnimatedRoleCard 
          index={1}
          title={t('auth.volunteer')}
          description={t('auth.roleVolunteerDesc')}
          iconName="heart-outline"
          accentColor={colors.primaryGreen}
          onPress={() => navigateToLogin('VOLUNTEER')}
        />

        <AnimatedRoleCard 
          index={2}
          title={t('auth.supervisor')}
          description={t('auth.roleSupervisorDesc')}
          iconName="business-outline"
          accentColor={colors.accentBlue}
          onPress={() => navigateToLogin('SUPERVISOR')}
        />
        
        <View style={styles.footer}>
          <MadeInIndiaBadge />
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1A237E', // Navy Blue header for professional feel
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 50,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  safeArea: {
    paddingHorizontal: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight || 0) + 15,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 1,
  },
  headerContent: {
    marginTop: 30,
  },
  title: {
    ...typography.displayTitle,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    ...typography.bodyText,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '90%',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    marginTop: -30,
  },
  cardWrapper: {
    marginBottom: spacing.lg,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  cardHeader: {
    flex: 1,
  },
  roleTitle: {
    ...typography.headingMedium,
    color: colors.navyBlue,
    fontSize: 22,
    fontWeight: '900',
  },
  roleDesc: {
    ...typography.bodyText,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
});

