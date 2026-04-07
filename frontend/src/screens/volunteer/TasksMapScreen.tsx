import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, StyleSheet, Text, Animated, Dimensions, 
  TouchableOpacity, FlatList, ActivityIndicator, 
  Platform, Linking, RefreshControl, ScrollView,
  LayoutAnimation, UIManager
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import MapView, { Marker, PROVIDER_GOOGLE, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { AppHeader, PrimaryButton } from '../../components';
import { colors, typography, globalStyles, spacing } from '../../theme';
import { useEventStore } from '../../services/store/useEventStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { getDistance, formatDistance } from '../../utils/geoUtils';
import { VolunteerAssignment } from '../../services/api/eventPredictionService';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_SPACING = spacing.md;

export const TasksMapScreen = () => {
  const { user } = useAuthStore();
  const { 
    assignments, 
    pendingAssignments, 
    loadAssignments, 
    respondAssignment, 
    loadingAssignments,
    loadingAction,
    liveMatches,
    loadLiveMatches,
    joinMatch
  } = useEventStore();

  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<(VolunteerAssignment & { distance?: number }) | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null); // null = all, else km

  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Enable LayoutAnimation for Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // 1. Initial Data Load
  useEffect(() => {
    if (user?.id) {
      loadAssignments(user.id);
      loadLiveMatches(user.id);
    }
    getUserLocation();

    // Start User Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2400, useNativeDriver: true })
      ])
    ).start();
  }, [user?.id]);

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    // Start live tracking
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
      (loc) => {
        setUserLocation(loc);
        // Auto-focus map on user if map isn't focused on a mission
        if (!selectedAssignment && mapReady) {
          // mapRef.current?.animateToRegion({ ... })
        }
      }
    );

    return () => subscription.remove();
  };

  // 1.5 Real-Time Task Sync (12-second polling to balance freshness and performance)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        loadAssignments(user.id);
        loadLiveMatches(user.id).catch(() => {}); // Prevent silent crashes from breaking interval
      }
    }, 12000); 
    return () => clearInterval(interval);
  }, [user?.id, loadAssignments, loadLiveMatches]);

  // 2. Process and Sort Missions
  const processedMissions = useMemo(() => {
    // Combine regular assignments + live matches
    const directMissions = assignments.filter(a => a.event_latitude && a.event_longitude);
    
    // Map live matches into a compatible structure
    const matchMissions = liveMatches
      .filter(m => m.latitude && m.longitude)
      .map(m => ({
        id: `match_${m.event_id}`,
        event_id: m.event_id,
        event_type: m.event_type,
        event_description: m.description || m.ai_reasoning || "Live match found based on your profile.",
        event_date_start: m.event_date_start,
        event_date_end: m.event_date_end,
        event_latitude: m.latitude,
        event_longitude: m.longitude,
        volunteer_area: m.area || "Location TBD",
        status: 'pending',
        is_live_match: true,
        match_score: m.match_score,
        score_breakdown: m.score_breakdown,
        ai_reasoning: m.ai_reasoning,
        event_required_skills: m.event_required_skills
      }));

    const baseMissions = [...directMissions, ...matchMissions];
    
    const enriched = baseMissions.map(m => {
      let dist = 0;
      if (userLocation) {
        dist = getDistance(
          { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
          { latitude: m.event_latitude!, longitude: m.event_longitude! }
        );
      }
      return { ...m, distance: dist };
    });

    // Apply distance filter ONLY if we have a user location
    let filtered = (distanceFilter && userLocation) 
      ? enriched.filter(m => m.distance <= distanceFilter)
      : enriched;

    // Sort by match_score DESC (highest match first), then distance ASC
    return filtered.sort((a, b) => {
      const matchA = a.match_score || 0;
      const matchB = b.match_score || 0;
      if (matchB !== matchA) return matchB - matchA;
      return (a.distance || 0) - (b.distance || 0);
    });
  }, [assignments, liveMatches, userLocation, distanceFilter]);


  // 3. Bottom Sheet Control
  useEffect(() => {
    if (selectedAssignment) {
      bottomSheetRef.current?.snapToIndex(1); // Open to 50%
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedAssignment]);

  // 4. Map Interactions
  const onMarkerPress = (mission: any, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAssignment(mission);
    
    // Sync: Highlight and scroll list
    listRef.current?.scrollToIndex({ 
      index, 
      animated: true, 
      viewPosition: 0.5 
    });

    // Sync: Center map on marker
    if (mission.event_latitude && mission.event_longitude) {
      mapRef.current?.animateToRegion({
        latitude: mission.event_latitude - 0.005,
        longitude: mission.event_longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }
  };

  const onCardPress = (mission: any) => {
    setSelectedAssignment(mission);
    if (mission.event_latitude && mission.event_longitude) {
      mapRef.current?.animateToRegion({
        latitude: mission.event_latitude - 0.005, // Offset so card doesn't block pin
        longitude: mission.event_longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 1000);
    }
  };

  const handleAccept = async () => {
    if (!selectedAssignment) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccepted(true);
    
    if ((selectedAssignment as any).is_live_match) {
      await joinMatch(
        (selectedAssignment as any).event_id, 
        user?.id || '', 
        'accepted',
        selectedAssignment.match_score,
        selectedAssignment.score_breakdown
      );
    } else {
      await respondAssignment(selectedAssignment.id, 'accepted');
    }
    
    // Refresh assignments locally to ensure the state is current
    if (user?.id) {
      loadAssignments(user.id);
      loadLiveMatches(user.id);
    }

    setTimeout(() => {
      setAccepted(false);
      setSelectedAssignment(null);
    }, 2500);
  };

  const openInMaps = () => {
    if (!selectedAssignment) return;
    const { event_latitude, event_longitude, event_type } = selectedAssignment;
    
    const lat = event_latitude;
    const lng = event_longitude;
    const label = encodeURIComponent(event_type || 'Mission Location');

    // Use a high-reliability coordinate-first URL format
    const url = Platform.select({
      ios: `maps:0,0?q=${label}&ll=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    });

    Linking.openURL(url);
  };

  if (!userLocation && !processedMissions.length && loadingAssignments) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loadingText}>Locating nearest missions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Nearby Missions" />

      {/* Distance Filter Chips */}
      <View style={styles.filterOverlay}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {[null, 5, 10, 20].map((dist) => (
            <TouchableOpacity 
              key={dist === null ? 'all' : dist}
              style={[styles.filterChip, distanceFilter === dist && styles.filterChipActive]}
              onPress={() => setDistanceFilter(dist)}
            >
              <Text style={[styles.filterChipTxt, distanceFilter === dist && styles.filterChipTxtActive]}>
                {dist === null ? 'All' : `${dist}km`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation?.coords.latitude || 19.0760,
          longitude: userLocation?.coords.longitude || 72.8777,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* 1. User's Live Location Marker (RED PIN) */}
        {userLocation && (
          <Marker
            coordinate={{ 
              latitude: userLocation.coords.latitude, 
              longitude: userLocation.coords.longitude 
            }}
            title="You are here"
            zIndex={100}
            tracksViewChanges={false}
          >
            <View style={styles.userMarkerContainer}>
              <Animated.View style={[
                styles.userMarkerPulse, 
                { 
                  backgroundColor: colors.error + '40', // Red Pulse
                  borderColor: colors.error,
                  transform: [{ scale: pulseAnim }], 
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.6, 0]
                  }) 
                }
              ]} />
              <View style={[styles.userMarkerDot, { backgroundColor: colors.error }]} />
            </View>
          </Marker>
        )}

        {/* 2. Connection Path (BLUE Polyline for SELECTED Mission only) */}
        {userLocation && selectedAssignment && (
          <Polyline
            coordinates={[
              { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
              { latitude: (selectedAssignment as any).event_latitude!, longitude: (selectedAssignment as any).event_longitude! }
            ]}
            strokeColor={colors.accentBlue} // Blue Path
            strokeWidth={4}
            lineDashPattern={undefined}
          />
        )}

        {/* 3. Missions Pins */}
        {processedMissions.map((m, i) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.event_latitude!, longitude: m.event_longitude! }}
            onPress={() => onMarkerPress(m, i)}
            zIndex={selectedAssignment?.id === m.id ? 1000 : i}
            tracksViewChanges={false}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={[
                styles.customMarker, 
                selectedAssignment?.id === m.id && styles.customMarkerActive,
                m.status === 'pending' && styles.customMarkerPending
              ]}>
                <Feather 
                  name={m.match_score >= 0.8 ? "zap" : "map-pin"} 
                  size={selectedAssignment?.id === m.id ? 22 : 18} 
                  color="#fff" 
                />
              </View>
              {/* The "Tail" of the pin */}
              <View style={[
                styles.markerPointer, 
                { borderTopColor: selectedAssignment?.id === m.id ? '#2962FF' : colors.primaryGreen }
              ]} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Horizontal List of Mission Cards */}
      <View style={styles.listOverlay}>
        <FlatList
          ref={listRef}
          data={processedMissions}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.missionCard, selectedAssignment?.id === item.id && styles.missionCardActive]}
              onPress={() => onCardPress(item)}
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchTxt}>{Math.round(item.match_score * 100)}% Match</Text>
                </View>
                <Text style={styles.distBadge}>{formatDistance(item.distance || 0)}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.event_type}</Text>
              <Text style={styles.cardArea} numberOfLines={1}><Feather name="map-pin" size={10} /> {item.volunteer_area}</Text>
              <View style={styles.skillsRow}>
                {item.event_required_skills?.slice(0, 2).map((s: string) => (
                  <View key={s} style={styles.skillDot} />
                ))}
                <Text style={styles.skillsLabel}>
                  {item.event_required_skills?.length} skills needed
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No missions found in this radius.</Text>
            </View>
          }
        />
      </View>

      {/* Floating My Location Button */}
      <TouchableOpacity 
        style={styles.myLocBtn}
        onPress={() => userLocation && mapRef.current?.animateToRegion({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        })}
      >
        <Feather name="crosshair" size={20} color={colors.primaryGreen} />
      </TouchableOpacity>

      {/* Detailed Mission Overlay (Sliding Bottom Sheet) */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={() => setSelectedAssignment(null)}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetView style={styles.sheetContent}>
          {selectedAssignment && !accepted ? (
            <>
              <View style={styles.detailHeader}>
                <View style={styles.detailCategory}>
                  <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.catIconBg}>
                    <Feather name="activity" size={20} color={colors.accentBlue} />
                  </LinearGradient>
                  <View>
                    <Text style={styles.detailType}>{selectedAssignment.event_type}</Text>
                    <Text style={styles.detailDistance}>{formatDistance(selectedAssignment.distance || 0)} from you</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedAssignment(null)} style={styles.closeDetail}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{Math.round(selectedAssignment.match_score * 100)}%</Text>
                  <Text style={styles.statLab}>MATCHING</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{selectedAssignment.event_date_start.split('-').slice(1).reverse().join('/')}</Text>
                  <Text style={styles.statLab}>DATE</Text>
                </View>
                <View style={styles.statDivider} />
                <TouchableOpacity style={styles.statItem} onPress={openInMaps}>
                  <Feather name="navigation" size={18} color={colors.primaryGreen} />
                  <Text style={[styles.statLab, { color: colors.primaryGreen, fontWeight: '700' }]}>MAPS</Text>
                </TouchableOpacity>
              </View>

              {/* NEW: Explicit Location Row */}
              <View style={styles.locationDetailRow}>
                <View style={styles.locationIconCircle}>
                  <Feather name="map-pin" size={14} color={colors.primaryGreen} />
                </View>
                <Text style={styles.locationDetailText} numberOfLines={2}>
                  {selectedAssignment.volunteer_area || (selectedAssignment as any).event_area || "Exact location details will be provided upon acceptance."}
                </Text>
              </View>

              <BottomSheetScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {/* NEW: Supervisor Description Section */}
                {selectedAssignment.event_description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionHeader}>MISSION DESCRIPTION</Text>
                    <Text style={styles.descriptionText}>{selectedAssignment.event_description}</Text>
                  </View>
                )}

                <Text style={styles.sectionHeader}>AI MATCHING REASONING</Text>
                <Text style={styles.aiReasoning}>
                  {(selectedAssignment as any).ai_reasoning || 
                   "🌟 Strong match! Your proximity and skill set make you an ideal volunteer for this mission."}
                </Text>

                <Text style={styles.sectionHeader}>REQUIRED SKILLS</Text>
                <View style={styles.skillsGrid}>
                  {selectedAssignment.event_required_skills?.map(s => (
                    <View key={s} style={styles.detailSkillChip}>
                      <Text style={styles.detailSkillTxt}>{s.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              </BottomSheetScrollView>

              <View style={styles.actionRow}>
                {selectedAssignment.status === 'accepted' ? (
                  <View style={styles.acceptedTag}>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={styles.acceptedTagTxt}>Mission Already Accepted</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.declineBtn} 
                      onPress={() => setSelectedAssignment(null)}
                    >
                      <Text style={styles.declineTxt}>Maybe Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.acceptBtn} 
                      onPress={handleAccept}
                      disabled={loadingAction}
                    >
                      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.acceptGradient}>
                        {loadingAction ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptTxt}>Accept Mission</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          ) : accepted ? (
            <View style={styles.successView}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
              <Text style={styles.successTitle}>Mission Accepted!</Text>
              <Text style={styles.successSub}>Thank you, {user?.name || 'Volunteer'}. Proceed to the location marked on the map.</Text>
            </View>
          ) : null}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontWeight: '600' },
  map: { flex: 1 },
  filterOverlay: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 100 : 80, 
    left: 0, 
    right: 0, 
    zIndex: 5 
  },
  filterBar: { paddingHorizontal: spacing.md, gap: 10, paddingBottom: 10 },
  filterChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterChipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  filterChipTxt: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  filterChipTxtActive: { color: '#fff' },
  listOverlay: { position: 'absolute', bottom: 10, left: 0, right: 0 },
  missionCard: { 
    width: CARD_WIDTH, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: spacing.md, 
    marginRight: CARD_SPACING,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  missionCardActive: { borderColor: colors.primaryGreen },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  matchBadge: { backgroundColor: colors.primaryGreen + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  matchTxt: { fontSize: 10, fontWeight: '700', color: colors.primaryGreen },
  distBadge: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardArea: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  skillsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentBlue },
  skillsLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
  customMarker: { 
    backgroundColor: colors.primaryGreen, 
    width: 32, height: 32, // More compact
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  customMarkerActive: { 
    backgroundColor: '#304FFE', // Dense Blue
    width: 38, height: 38, // Slightly larger when active
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 1000,
  },
  // Sub-pointer and Distances
  markerPointer: {
    width: 0, height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: -2,
    alignSelf: 'center',
  },
  customMarkerPending: {
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  markerDistLabel: {
    position: 'absolute',
    top: -18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  markerDistTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },

  userMarkerContainer: { alignItems: 'center', justifyContent: 'center' },
  userMarkerDot: { 
    width: 14, height: 14, borderRadius: 7, 
    backgroundColor: colors.error, 
    borderWidth: 2, borderColor: '#fff',
    elevation: 8,
    shadowColor: colors.error,
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  userMarkerPulse: { 
    position: 'absolute',
    width: 34, height: 34, 
    borderRadius: 17, 
    backgroundColor: colors.error + '30',
    borderWidth: 1,
    borderColor: colors.error,
  },
  myLocBtn: { 
    position: 'absolute', 
    right: 20, 
    bottom: 180, 
    backgroundColor: '#fff', 
    width: 44, height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 20,
    flex: 1,
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: '#e0e0e0',
    width: 40,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  detailCategory: { flexDirection: 'row', gap: 15, flex: 1 },
  catIconBg: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailType: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  detailDistance: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  closeDetail: { padding: 5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#f8f9fa', borderRadius: 16, padding: 15, marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  statLab: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: '#ddd' },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  navBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
  detailScroll: { maxHeight: 250 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1, marginBottom: 10, marginTop: 5 },
  aiReasoning: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 15, fontStyle: 'italic' },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fdf9',
    marginHorizontal: spacing.lg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f5e9',
    marginBottom: 15,
  },
  locationIconCircle: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationDetailText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  descriptionSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  detailSkillChip: { backgroundColor: '#f0f4f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  detailSkillTxt: { fontSize: 12, fontWeight: '600', color: '#546e7a', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  declineTxt: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  acceptBtn: { flex: 2, height: 54, borderRadius: 16, overflow: 'hidden' },
  acceptGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  acceptTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  acceptedTag: { flex: 1, height: 54, borderRadius: 16, backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  acceptedTagTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successView: { alignItems: 'center', paddingVertical: 30 },
  successTitle: { ...typography.headingLarge, color: colors.success, marginTop: 20 },
  successSub: { ...typography.bodyText, textAlign: 'center', color: colors.textSecondary, marginTop: 10, paddingHorizontal: 30 },
  emptyList: { width: width - 40, height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, fontWeight: '600' },
});
