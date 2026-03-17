import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme';

interface MapMarkerProps {
  type: 'alert' | 'user' | 'resource';
  selected?: boolean;
}

export const MapMarker: React.FC<MapMarkerProps> = ({ type, selected = false }) => {
  const getMarkerColor = () => {
    switch (type) {
      case 'alert': return colors.error;
      case 'user': return colors.accentBlue;
      case 'resource': return colors.primaryGreen;
      default: return colors.primarySaffron;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'alert': return 'alert-triangle';
      case 'user': return 'user';
      case 'resource': return 'package';
      default: return 'map-pin';
    }
  };

  const color = getMarkerColor();

  return (
    <View style={[styles.container, selected && styles.selected]}>
      <View style={[styles.marker, { backgroundColor: color }]}>
        <Feather name={getIconName()} size={16} color={colors.cardBackground} />
      </View>
      <View style={[styles.triangle, { borderTopColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    transform: [{ scale: 1.2 }],
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1, // Overlap slightly to avoid gaps
  },
});
