/**
 * mapsConfig.ts
 * Central configuration for Google Maps API.
 */

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const MAP_CONFIG = {
  defaultRegion: {
    latitude: 19.0760, // Mumbai
    longitude: 72.8777,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  geofenceDefaults: {
    radius: 150, // meters
    color: 'rgba(27, 94, 32, 0.2)',
    strokeColor: '#1B5E20',
  }
};
