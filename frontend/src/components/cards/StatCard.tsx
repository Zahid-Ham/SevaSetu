import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, globalStyles } from '../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  iconName: keyof typeof Feather.glyphMap;
  iconColor?: string;
  style?: ViewStyle;
}

// A custom component for animating the number
const AnimatedNumber: React.FC<{ targetValue: string | number }> = ({ targetValue }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Parse the target value. Handle cases like "12.4k" or "42"
    let numericTarget = 0;
    let suffix = '';

    const strVal = String(targetValue);
    const match = strVal.match(/^([\d.]+)(.*)$/);
    
    if (match) {
        numericTarget = parseFloat(match[1]);
        suffix = match[2];
    }

    if (!match || isNaN(numericTarget)) {
       setDisplayValue(strVal);
       return;
    }

    // Reset and animate
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: numericTarget,
      duration: 1500, // Slightly faster, punchier animation (1.5s)
      useNativeDriver: false, // Text content implies no native driver
    }).start();

    const listenerId = animValue.addListener(({ value }) => {
       const formatted = Number.isInteger(numericTarget) ? Math.floor(value).toString() : value.toFixed(1);
       setDisplayValue(`${formatted}${suffix}`);
    });

    return () => {
      animValue.removeListener(listenerId);
    };
  }, [targetValue]); // Re-run if targetValue changes from API

  return <Text style={styles.valueText}>{displayValue}</Text>;
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  iconName,
  iconColor = colors.primarySaffron,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: iconColor + '15' }]}>
        <Feather name={iconName} size={24} color={iconColor} />
      </View>
      <View style={styles.content}>
        <AnimatedNumber targetValue={value} />
        <Text style={styles.titleText}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warmWhite,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.primarySaffron,
    // Premium Shadow
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  content: {
    alignItems: 'center',
  },
  valueText: {
    ...typography.headingLarge,
    fontSize: 24,
    color: colors.navyBlue,
    marginBottom: 2,
    fontWeight: '800',
  },
  titleText: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

