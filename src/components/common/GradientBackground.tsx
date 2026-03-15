import { StyleSheet, View, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AshokaChakra } from './AshokaChakra';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  showChakra?: boolean;
  style?: ViewStyle;
  variant?: 'auth' | 'dashboard' | 'light' | 'onboarding';
}

export const GradientBackground = ({
  children,
  showChakra = false,
  style,
  variant = 'auth',
}: GradientBackgroundProps) => {
  
  const getGradientConfigs = () => {
    switch (variant) {
      case 'dashboard':
        return {
          colors: ['#FF8C42', '#FFFFFF'] as const,
          locations: [0, 1] as const,
          isHeaderOnly: true,
        };
      case 'light':
        return {
          colors: ['#FFFFFF', '#2E7D3220'] as const,
          locations: [0, 1] as const,
          isHeaderOnly: false,
        };
      case 'onboarding':
        return {
          colors: ['#FFE0B2', '#FFFFFF', '#C8E6C9'] as const, // More visible tricolor shades
          locations: [0, 0.5, 1] as const,
          isHeaderOnly: false,
        };
      case 'auth':
      default:
        return {
          colors: ['#FF8C42', '#FFFFFF', '#FFFFFF', '#2E7D32'] as const,
          locations: [0, 0.4, 0.6, 1] as const,
          isHeaderOnly: false,
        };
    }
  };

  const config = getGradientConfigs();

  if (config.isHeaderOnly) {
    return (
      <View style={[styles.container, { backgroundColor: '#F5F5F5' }, style]}>
        <LinearGradient
          colors={config.colors}
          locations={config.locations}
          style={styles.headerGradient}
        />
        {showChakra && <AshokaChakra />}
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={config.colors}
      locations={config.locations}
      style={[styles.container, style]}
    >
      {showChakra && <AshokaChakra />}
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
});
