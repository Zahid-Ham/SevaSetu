import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform, Dimensions
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { colors, spacing, typography } from '../theme';

import { GOOGLE_MAPS_API_KEY } from '../config/mapsConfig';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: {
    latitude: number;
    longitude: number;
    address: string;
    geofence_radius: number;
  }) => void;
  initialLocation?: { latitude: number; longitude: number; address?: string };
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible, onClose, onConfirm, initialLocation
}) => {
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 19.0760, // Default Mumbai
    longitude: initialLocation?.longitude || 72.8777,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [address, setAddress] = useState(initialLocation?.address || 'Loading address...');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(150);

  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permission to access location was denied');
          return;
        }

        if (!initialLocation) {
          let location = await Location.getCurrentPositionAsync({});
          const newRegion = {
            ...region,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
          performReverseGeocode(location.coords.latitude, location.coords.longitude);
        } else {
          performReverseGeocode(initialLocation.latitude, initialLocation.longitude);
        }
      })();
    }
  }, [visible]);

  const performReverseGeocode = async (lat: number, lon: number) => {
    setReverseGeocoding(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.results && response.data.results.length > 0) {
        setAddress(response.data.results[0].formatted_address || 'Unknown Location');
      } else {
        setAddress('Point on Map');
      }
    } catch (error) {
      console.error('Google Reverse Geocoding Error:', error);
      setAddress('Point on Map');
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`
        );
        setSearchResults(response.data.predictions || []);
      } catch (error) {
        console.error('Google Places Search Error:', error);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);
  };

  const selectResult = async (item: any) => {
    setLoadingSearch(true);
    try {
      // Get lat/lng from Place ID
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const { location } = response.data.result.geometry;
      const lat = location.lat;
      const lon = location.lng;
      
      const newRegion = {
        ...region,
        latitude: lat,
        longitude: lon,
      };
      setRegion(newRegion);
      setAddress(response.data.result.formatted_address);
      setSearchResults([]);
      setSearchQuery('');
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Google Place Details Error:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const onRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
    performReverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: region.latitude,
      longitude: region.longitude,
      address,
      geofence_radius: geofenceRadius
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header with Search */}
        <View style={styles.header}>
          <View style={styles.searchBarContainer}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Feather name="chevron-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <Feather name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a location..."
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {loadingSearch && <ActivityIndicator size="small" color={colors.primaryGreen} />}
            </View>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsDropdown}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => selectResult(item)}
                >
                  <Feather name="map-pin" size={14} color={colors.textSecondary} />
                  <Text style={styles.resultText} numberOfLines={1}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation
          >
            {/* The geofence preview circle */}
            <Circle
              center={{ latitude: region.latitude, longitude: region.longitude }}
              radius={geofenceRadius}
              fillColor="rgba(76, 175, 80, 0.2)"
              strokeColor="rgba(76, 175, 80, 0.5)"
              strokeWidth={2}
            />
          </MapView>

          {/* Central Pin (Draggable UX: map moves under the pin) */}
          <View style={styles.markerFixed} pointerEvents="none">
             <View style={styles.markerShadow} />
             <Feather name="map-pin" size={40} color={colors.primaryGreen} />
          </View>

          {/* Location Details Card */}
          <View style={styles.detailsCard}>
             <View style={styles.addressRow}>
               <View style={styles.addressInfo}>
                 <Text style={styles.addressLabel}>SELECTED MISSION AREA</Text>
                 <Text style={styles.addressText} numberOfLines={2}>
                   {reverseGeocoding ? 'Locating...' : address}
                 </Text>
               </View>
               {reverseGeocoding && <ActivityIndicator size="small" color={colors.primaryGreen} />}
             </View>

             <View style={styles.radiusRow}>
                <Text style={styles.radiusLabel}>GEOFENCE RADIUS: {geofenceRadius}m</Text>
                <View style={styles.radiusControls}>
                  <TouchableOpacity 
                    style={styles.radiusBtn} 
                    onPress={() => setGeofenceRadius(Math.max(100, geofenceRadius - 50))}
                  >
                    <Feather name="minus" size={18} color={colors.primaryGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.radiusBtn} 
                    onPress={() => setGeofenceRadius(Math.min(500, geofenceRadius + 50))}
                  >
                    <Feather name="plus" size={18} color={colors.primaryGreen} />
                  </TouchableOpacity>
                </View>
             </View>

             <TouchableOpacity 
               style={styles.confirmBtn} 
               onPress={handleConfirm}
               disabled={reverseGeocoding}
             >
               <Text style={styles.confirmBtnText}>Confirm Mission Location</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingHorizontal: spacing.md, 
    paddingBottom: spacing.sm,
    backgroundColor: '#fff',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 5 },
  inputWrapper: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f5f5f5', 
    borderRadius: 12, 
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  resultsDropdown: { 
    position: 'absolute', 
    top: '100%', 
    left: spacing.md, 
    right: spacing.md, 
    backgroundColor: '#fff', 
    borderRadius: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  resultText: { fontSize: 13, color: colors.textPrimary, flex: 1 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  markerFixed: {
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    position: 'absolute',
    top: '50%',
  },
  markerShadow: {
    width: 10,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
    left: 15,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 40,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  addressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
  addressText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
  radiusRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: spacing.md
  },
  radiusLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  radiusControls: { flexDirection: 'row', gap: 10 },
  radiusBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: colors.primaryGreen, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  confirmBtn: { 
    backgroundColor: colors.primaryGreen, 
    borderRadius: 12, 
    height: 50, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
