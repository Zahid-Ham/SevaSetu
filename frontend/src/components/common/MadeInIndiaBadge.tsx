import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const MadeInIndiaBadge = () => {
  return (
    <View style={styles.container}>
      <View style={styles.tricolorBar}>
        <View style={[styles.barSegment, { backgroundColor: '#FF8C42' }]} />
        <View style={[styles.barSegment, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.barSegment, { backgroundColor: '#138808' }]} />
      </View>
      <Image 
        source={require('../../assets/make-in-india.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <Text style={styles.text}>Made in India  |  मेक इन इंडिया</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tricolorBar: {
    flexDirection: 'row',
    height: 3,
    width: 120,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
    opacity: 0.8,
  },
  barSegment: {
    flex: 1,
    height: '100%',
  },
  logo: {
    height: 28,
    width: 100,
    opacity: 0.9,
    marginBottom: 6,
  },
  text: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

