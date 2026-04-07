import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Heatmap } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapMarker } from './MapMarker';
import { colors, spacing, typography, globalStyles } from '../../theme';

export interface Issue {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'medium' | 'resolved';
  latitude: number;
  longitude: number;
}

interface CrisisMapProps {
  issues: Issue[];
  onIssuePress?: (issue: Issue) => void;
  hideDefaultCard?: boolean;
  showHeatmap?: boolean;
  focusedIssueId?: string | null;
}

export const CrisisMap: React.FC<CrisisMapProps> = ({ 
  issues, 
  onIssuePress, 
  hideDefaultCard = false,
  showHeatmap = true,
  focusedIssueId = null
}) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const mapRef = React.useRef<MapView | null>(null);

  // Focus User Logic
  const focusOnUser = (coords: { latitude: number, longitude: number }) => {
    if (mapRef.current && isMapReady) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // Try fast last known position first
      const lastPos = await Location.getLastKnownPositionAsync({});
      if (lastPos) {
        setLocation(lastPos);
        if (isMapReady) focusOnUser(lastPos.coords);
      }

      // Then get precise current position
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      if (isMapReady) focusOnUser(currentLocation.coords);
    })();
  }, [isMapReady]);

  useEffect(() => {
    if (focusedIssueId && isMapReady) {
      const issue = issues.find(i => i.id === focusedIssueId);
      if (issue) {
        setSelectedIssue(issue);
        mapRef.current?.animateToRegion({
          latitude: issue.latitude,
          longitude: issue.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
  }, [focusedIssueId, isMapReady]);

  const getMarkerColorOverride = (priority: Issue['priority']) => {
    switch(priority) {
      case 'urgent': return colors.error; // Red
      case 'medium': return colors.warning; // Yellow
      case 'resolved': return colors.success; // Green
      default: return colors.error;
    }
  }

  const handleMarkerPress = (issue: Issue) => {
    setSelectedIssue(issue);
    if (onIssuePress) onIssuePress(issue);
  };

  // Prepare points for Heatmap
  const heatmapPoints = issues.map(iss => ({
    latitude: iss.latitude,
    longitude: iss.longitude,
    weight: iss.priority === 'urgent' ? 3 : iss.priority === 'medium' ? 2 : 1
  }));

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        onMapReady={() => setIsMapReady(true)}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {location && (
          <Marker
            coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
            title="You Are Here"
            description="Supervisor's current location"
          >
            <View style={styles.userMarkerOuter}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}

        {showHeatmap && heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={40}
            opacity={0.7}
            gradient={{
              colors: ['#00FF00', '#FBBF24', '#EF4444'],
              startPoints: [0.2, 0.5, 0.8],
              colorMapSize: 256,
            }}
          />
        )}

        {issues.map((issue) => (
          <Marker
            key={issue.id}
            coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
            onPress={() => handleMarkerPress(issue)}
          >
            <View style={[styles.customMarker, { backgroundColor: getMarkerColorOverride(issue.priority) }]} />
          </Marker>
        ))}
      </MapView>
      
      {errorMsg ? (
         <View style={styles.errorContainer}>
           <Text style={styles.errorText}>{errorMsg}</Text>
         </View>
      ) : null}

      {!hideDefaultCard && selectedIssue && (
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[globalStyles.card, styles.detailCard]}
          onPress={() => setSelectedIssue(null)}
        >
          <View style={styles.detailHeader}>
            <View style={[styles.priorityBadge, { backgroundColor: getMarkerColorOverride(selectedIssue.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getMarkerColorOverride(selectedIssue.priority) }]}>
                {selectedIssue.priority.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.coordsText}>
              {selectedIssue.latitude.toFixed(4)}, {selectedIssue.longitude.toFixed(4)}
            </Text>
          </View>
          <Text style={[typography.headingSmall, styles.issueTitle]} numberOfLines={1}>{selectedIssue.title}</Text>
          <Text style={[typography.bodyText, styles.issueDesc]} numberOfLines={3}>{selectedIssue.description}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  customMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.error + 'E6', // slightly transparent red
    padding: spacing.md,
    borderRadius: 8,
  },
  errorText: {
    color: colors.cardBackground,
    textAlign: 'center',
    fontWeight: '600',
  },
  detailCard: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  coordsText: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontSize: 10,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    ...typography.captionText,
    fontSize: 10,
    fontWeight: '700',
  },
  issueTitle: {
    marginBottom: 2,
  },
  issueDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  userMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 35, 126, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentBlue,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
