import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { MadeInIndiaBadge, GradientBackground } from '../../components';

// RoleCard upgraded to use Reanimated + Haptics
type RoleCardProps = {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

const AnimatedRoleCard: React.FC<RoleCardProps> = ({ title, description, iconName, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.roleCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={28} color={colors.primarySaffron} />
          </View>
          <Text style={styles.roleTitle}>{title}</Text>
        </View>
        <Text style={styles.roleDesc}>{description}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const RoleSelectionScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const navigateToLogin = (role: string) => {
    navigation.navigate('Login', { role });
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.headerGradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Select Your Role</Text>
            <Text style={styles.subtitle}>
              Choose how you want to interact with SevaSetu and connect with your community.
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        <AnimatedRoleCard 
          title="Citizen"
          description="Report issues and request help."
          iconName="people"
          onPress={() => navigateToLogin('CITIZEN')}
        />

        <AnimatedRoleCard 
          title="Volunteer"
          description="Join missions and support communities."
          iconName="hand-right"
          onPress={() => navigateToLogin('VOLUNTEER')}
        />

        <AnimatedRoleCard 
          title="NGO Supervisor"
          description="Manage operations and impact."
          iconName="briefcase"
          onPress={() => navigateToLogin('SUPERVISOR')}
        />
        
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.xl }}>
          <MadeInIndiaBadge />
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  safeArea: {
    // Ensures status bar clearing on iOS
  },
  headerContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl * 1.5,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontSize: 32,
  },
  subtitle: {
    ...typography.bodyText,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    marginTop: -spacing.xl, // overlap the rounded header
  },
  roleCard: {
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySaffron + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  roleDesc: {
    ...typography.bodyText,
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: 48 + spacing.md, // align with text instead of icon
  },
});
