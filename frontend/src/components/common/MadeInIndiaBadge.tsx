import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const MadeInIndiaBadge = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/make-in-india.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <Text style={styles.text}>Made in India | मेक इन इंडिया</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logo: {
    height: 32,
    width: 120,
    opacity: 0.8,
    marginBottom: 4,
  },
  text: {
    ...typography.captionText,
    color: colors.textSecondary,
    opacity: 0.7,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
