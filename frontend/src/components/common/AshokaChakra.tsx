import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface AshokaChakraProps {
  size?: number;
  opacity?: number;
  color?: string;
}

export const AshokaChakra = ({ 
  size = width * 1.5, 
  opacity = 0.12, 
  color = "#000080" 
}: AshokaChakraProps) => {
  const center = size / 2;
  const radius = center - 20;

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
          strokeWidth="2" 
          opacity={opacity * 2} 
        />
      </G>
    );
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={size} height={size}>
        <Circle 
          cx={center} 
          cy={center} 
          r={radius} 
          stroke={color} 
          strokeWidth="4" 
          fill="transparent" 
          opacity={opacity} 
        />
        <Circle 
          cx={center} 
          cy={center} 
          r={radius * 0.8} 
          stroke={color} 
          strokeWidth="1" 
          fill="transparent" 
          opacity={opacity} 
        />
        {spokes}
        <Circle cx={center} cy={center} r={10} fill={color} opacity={opacity * 2} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
