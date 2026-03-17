import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
}

export const CrisisMap: React.FC<CrisisMapProps> = ({ issues, onIssuePress, hideDefaultCard = false }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const getMarkerType = (priority: Issue['priority']): 'alert' | 'resource' | 'user' => {
    switch (priority) {
      case 'urgent': return 'alert';
      case 'medium': return 'user'; // We'll map Yellow/Medium to AccentBlue user-style marker for now, or you could extend MapMarker
      case 'resolved': return 'resource';
      default: return 'alert';
    }
  };

  const getMarkerColorOverride = (priority: Issue['priority']) => {
    switch(priority) {
      case 'urgent': return colors.error; // Red
      case 'medium': return colors.warning; // Yellow
      case 'resolved': return colors.success; // Green
    }
  }

  const handleMarkerPress = (issue: Issue) => {
    setSelectedIssue(issue);
    if (onIssuePress) onIssuePress(issue);
  };

  return (
    <View style={styles.container}>
      <MapView 
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: location?.coords.latitude || 28.6139,
          longitude: location?.coords.longitude || 77.2090,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        region={location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        } : undefined}
      >
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
            onPress={() => handleMarkerPress(issue)}
          >
            {/* Using a custom View here instead of MapMarker to strictly enforce the requested Red/Yellow/Green coloring easily */}
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
          <View style={[styles.priorityBadge, { backgroundColor: getMarkerColorOverride(selectedIssue.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getMarkerColorOverride(selectedIssue.priority) }]}>
              {selectedIssue.priority.toUpperCase()}
            </Text>
          </View>
          <Text style={[typography.headingSmall, styles.issueTitle]} numberOfLines={1}>{selectedIssue.title}</Text>
          <Text style={[typography.bodyText, styles.issueDesc]} numberOfLines={2}>{selectedIssue.description}</Text>
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
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  priorityText: {
    ...typography.captionText,
    fontSize: 10,
    fontWeight: '700',
  },
  issueTitle: {
    marginBottom: spacing.xs,
  },
  issueDesc: {
    color: colors.textSecondary,
  },
});
