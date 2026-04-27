import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface AshokaChakraProps {
  size?: number;
  opacity?: number;
  color?: string;
  style?: any;
}

export const AshokaChakra = ({ 
  size = 100, 
  opacity = 0.12, 
  color = "#000080",
  style
}: AshokaChakraProps) => {
  const center = size / 2;
  const radius = center - 5;

  const spokes = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i * 360) / 24;
    return (
      <G key={i} rotation={angle} origin={`${center}, ${center}`}>
        <Line 
          x1={center} 
          y1={center} 
          x2={center} 
          y2={center - radius} 
          stroke={color} 
          strokeWidth={size * 0.02} 
          opacity={opacity * 2} 
        />
      </G>
    );
  });

  // Safety check: if Svg or needed components are missing (native module error), 
  // we return a standard View with a similar aesthetic to avoid crashing the whole app.
  if (!Svg || !Circle) {
    return (
      <View style={[styles.container, style, { width: size, height: size, borderRadius: size/2, borderStyle: 'dashed', borderWidth: 2, borderColor: color, opacity: opacity }]} />
    );
  }

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle 
          cx={center} 
          cy={center} 
          r={radius} 
          stroke={color} 
          strokeWidth={size * 0.04} 
          fill="transparent" 
          opacity={opacity} 
        />
        {spokes}
        <Circle cx={center} cy={center} r={size * 0.08} fill={color} opacity={opacity * 2} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
