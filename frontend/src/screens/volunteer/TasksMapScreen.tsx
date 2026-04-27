import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, StyleSheet, Text, Animated, Dimensions, 
  TouchableOpacity, FlatList, ActivityIndicator, 
  Platform, Linking, RefreshControl, ScrollView,
  LayoutAnimation, UIManager
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { AppHeader, PrimaryButton, DynamicText } from '../../components';
import { colors, typography, globalStyles, spacing } from '../../theme';
import { useEventStore } from '../../services/store/useEventStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { getDistance, formatDistance } from '../../utils/geoUtils';
import { getBilingualText } from '../../utils/bilingualHelpers';
import { VolunteerAssignment } from '../../services/api/eventPredictionService';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_SPACING = spacing.md;

export const TasksMapScreen = () => {
  const { t, language } = useLanguage();
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

  const webViewRef = useRef<any>(null);
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
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
      (loc) => { setUserLocation(loc); }
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
    const directMissions = (assignments || [])
      .filter(a => {
        const lat = parseFloat(String(a.event_latitude));
        const lng = parseFloat(String(a.event_longitude));
        return !isNaN(lat) && !isNaN(lng);
      })
      .map(a => ({
        ...a,
        event_latitude: parseFloat(String(a.event_latitude)),
        event_longitude: parseFloat(String(a.event_longitude)),
      }));
    
    // Map live matches into a compatible structure
    const matchMissions = (liveMatches || [])
      .filter(m => {
        const lat = parseFloat(String(m.latitude));
        const lng = parseFloat(String(m.longitude));
        return !isNaN(lat) && !isNaN(lng);
      })
      .map(m => ({
        id: `match_${m.event_id}`,
        event_id: m.event_id,
        event_type: m.event_type,
        event_description: m.description || m.ai_reasoning || t('volunteer.tasksMap.exactLocationTbd'),
        event_date_start: m.event_date_start,
        event_date_end: m.event_date_end,
        event_latitude: parseFloat(String(m.latitude)),
        event_longitude: parseFloat(String(m.longitude)),
        volunteer_area: m.area || t('volunteer.tasksMap.exactLocationTbd'),
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
      if (userLocation && !isNaN(userLocation.coords.latitude) && !isNaN(userLocation.coords.longitude)) {
        try {
          dist = getDistance(
            { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
            { latitude: m.event_latitude, longitude: m.event_longitude }
          );
        } catch (e) {
          console.warn('[TasksMapScreen] getDistance error:', e);
          dist = 0;
        }
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
      webViewRef.current?.injectJavaScript(`
        if (window.mapInstance) {
          window.mapInstance.panTo({ lat: ${mission.event_latitude - 0.005}, lng: ${mission.event_longitude} });
          window.mapInstance.setZoom(14);
        } true;
      `);
    }
  };

  const onCardPress = (mission: any) => {
    setSelectedAssignment(mission);
    // Send message to WebView to center map
    if (mission.event_latitude && mission.event_longitude) {
      webViewRef.current?.injectJavaScript(`
        if (window.mapInstance) {
          window.mapInstance.panTo({ lat: ${0}, lng: ${0} });
          window.mapInstance.setZoom(14);
        }
        true;
      `.replace('lat: ${0}', `lat: ${mission.event_latitude}`).replace('lng: ${0}', `lng: ${mission.event_longitude}`));
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
    const typeStr = getBilingualText(event_type, language);
    const translatedType = t(`demo.${typeStr}`) !== `demo.${typeStr}` ? t(`demo.${typeStr}`) : typeStr;
    const label = encodeURIComponent(translatedType || t('volunteer.tasksMap.nearbyMissions'));

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
        <Text style={styles.loadingText}>{t('volunteer.tasksMap.locatingMissions')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={t('volunteer.tasksMap.nearbyMissions')} />

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
                {dist === null ? t('volunteer.tasksMap.all') : t(`volunteer.tasksMap.km${dist}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        onLoad={() => setMapReady(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.missionId) {
              const idx = processedMissions.findIndex(m => m.id === data.missionId);
              if (idx >= 0) onMarkerPress(processedMissions[idx], idx);
            }
          } catch {}
        }}
        source={{ html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1.0, width=device-width" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css?t=${Date.now()}" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js?t=${Date.now()}"></script>
  <style>
    * { margin:0; padding:0; } 
    html,body,#map { width:100%; height:100%; }
    #engine-mark { position:fixed; bottom:5px; left:5px; z-index:1000; font-size:8px; color:#999; pointer-events:none; }
  </style>
</head>
<body>
  <div id="engine-mark">OSM+Leaflet (Missions)</div>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true })
      .setView([${userLocation?.coords.latitude || 19.076}, ${userLocation?.coords.longitude || 72.8777}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);
    window.mapInstance = map;

    ${userLocation ? `
    L.circleMarker([${userLocation.coords.latitude}, ${userLocation.coords.longitude}], {
      radius: 12, fillColor: '#E53935', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map).bindPopup('You are here');
    ` : ''}

    ${processedMissions.map(m => `
    (function() {
      var isSelected = ${selectedAssignment?.id === m.id ? 'true' : 'false'};
      var color = isSelected ? '#304FFE' : '${(m.match_score || 0) >= 0.8 ? '#F59E0B' : '#2E7D32'}';
      L.circleMarker([${m.event_latitude}, ${m.event_longitude}], {
        radius: isSelected ? 14 : 10,
        fillColor: color, color: '#fff', weight: 2, fillOpacity: 1
      }).addTo(map)
        .bindPopup(${JSON.stringify(m.event_type || '')})
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ missionId: '${m.id}' }));
        });
    })();
    `).join('\n')}

    ${userLocation && selectedAssignment ? `
    L.polyline([
      [${userLocation.coords.latitude}, ${userLocation.coords.longitude}],
      [${(selectedAssignment as any).event_latitude}, ${(selectedAssignment as any).event_longitude}]
    ], { color: '#1565C0', weight: 3, opacity: 0.8 }).addTo(map);
    ` : ''}
  </script>
</body>
</html>
        ` }}
      />

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
              <LinearGradient 
                colors={selectedAssignment?.id === item.id ? [colors.primaryGreen + '10', '#fff'] : ['#fff', '#fff']} 
                style={styles.cardGradient}
              >
                <View style={styles.cardTop}>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchTxt}>{Math.round(item.match_score * 100)}% {t('assignments.skillMatch')}</Text>
                  </View>
                  <Text style={styles.distBadge}>{formatDistance(item.distance || 0)}</Text>
                </View>
                <DynamicText style={styles.cardTitle} numberOfLines={1} text={item.event_type} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Feather name="map-pin" size={10} color={colors.textSecondary} />
                  <DynamicText style={styles.cardArea} numberOfLines={1} text={item.volunteer_area} />
                </View>
                <View style={styles.skillsRow}>
                  {item.event_required_skills?.slice(0, 3).map((s: string, idx: number) => (
                    <View key={idx} style={[styles.skillDot, { backgroundColor: colors.accentBlue }]} />
                  ))}
                  <Text style={styles.skillsLabel}>
                    {item.event_required_skills?.length} {t('volunteer.tasksMap.skillsNeeded')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>{t('volunteer.tasksMap.noMissions')}</Text>
            </View>
          }
        />
      </View>

      {/* Floating My Location Button */}
      <TouchableOpacity 
        style={styles.myLocBtn}
        onPress={() => {
          if (userLocation) {
            webViewRef.current?.injectJavaScript(`
              if (window.mapInstance) {
                window.mapInstance.panTo({ lat: ${userLocation.coords.latitude}, lng: ${userLocation.coords.longitude} });
                window.mapInstance.setZoom(15);
              } true;
            `);
          }
        }}
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
        <View style={styles.sheetContent}>
          {selectedAssignment && !accepted ? (
            <>
              <View style={styles.detailHeader}>
                <View style={styles.detailCategory}>
                  <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.catIconBg}>
                    <Feather name="activity" size={20} color={colors.accentBlue} />
                  </LinearGradient>
                  <View>
                    <DynamicText style={styles.detailType} text={selectedAssignment.event_type} />
                    <Text style={styles.detailDistance}>{formatDistance(selectedAssignment.distance || 0)} {t('volunteer.tasksMap.fromYou')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedAssignment(null)} style={styles.closeDetail}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{Math.round(selectedAssignment.match_score * 100)}%</Text>
                  <Text style={styles.statLab}>{t('assignments.skillMatch').toUpperCase()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{selectedAssignment.event_date_start.split('-').slice(1).reverse().join('/')}</Text>
                  <Text style={styles.statLab}>{t('supervisor.assignmentManager.date').toUpperCase()}</Text>
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
                <DynamicText style={styles.locationDetailText} numberOfLines={2} text={selectedAssignment.volunteer_area || (selectedAssignment as any).event_area || t('volunteer.tasksMap.exactLocationTbd')} />
              </View>

                <BottomSheetScrollView 
                  style={styles.detailScroll} 
                  contentContainerStyle={{ paddingBottom: 150 }} 
                  showsVerticalScrollIndicator={true}
                >
                {/* NEW: Supervisor Description Section */}
                {selectedAssignment.event_description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionHeader}>{t('volunteer.assignments.missionDetails').toUpperCase()}</Text>
                    <DynamicText 
                      style={styles.descriptionText} 
                      text={selectedAssignment.event_description} 
                      collection="assignments"
                      docId={selectedAssignment.id}
                      field="event_description"
                    />
                  </View>
                )}

                <Text style={styles.sectionHeader}>{t('supervisor.assignmentManager.aiReasoning').toUpperCase()}</Text>
                <DynamicText 
                  style={styles.aiReasoning} 
                  text={(selectedAssignment as any).ai_reasoning || t('volunteer.tasksMap.defaultAiReasoning')} 
                  collection="assignments"
                  docId={selectedAssignment.id}
                  field="ai_reasoning"
                />

                <Text style={styles.sectionHeader}>{t('assignments.filterBySkills').toUpperCase()}</Text>
                <View style={styles.skillsGrid}>
                  {selectedAssignment.event_required_skills?.map(s => (
                    <View key={s} style={styles.detailSkillChip}>
                      <Text style={styles.detailSkillTxt}>{t(`skills.${s}`) !== `skills.${s}` ? t(`skills.${s}`) : s.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>

                {/* Move Action Row INSIDE ScrollView to ensure visibility */}
                <View style={[styles.actionRow, { marginTop: 20, marginBottom: 20 }]}>
                  {selectedAssignment.status === 'accepted' ? (
                    <View style={styles.acceptedTag}>
                      <Feather name="check-circle" size={18} color="#fff" />
                      <Text style={styles.acceptedTagTxt}>{t('volunteer.tasksMap.accepted')}</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity 
                        style={styles.declineBtn} 
                        onPress={() => setSelectedAssignment(null)}
                      >
                        <Text style={styles.declineTxt}>{t('volunteer.tasksMap.maybeLater')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.acceptBtn} 
                        onPress={handleAccept}
                        disabled={loadingAction}
                      >
                        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.acceptGradient}>
                          {loadingAction ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptTxt}>{t('volunteer.tasksMap.acceptMission')}</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </BottomSheetScrollView>
            </>
          ) : accepted ? (
            <View style={styles.successView}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
              <Text style={styles.successTitle}>{t('volunteer.tasksMap.missionAccepted')}</Text>
              <Text style={styles.successSub}>{t('volunteer.tasksMap.proceedToLocation')}</Text>
            </View>
          ) : null}
        </View>
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
    top: Platform.OS === 'ios' ? 110 : 90, 
    left: 0, 
    right: 0, 
    zIndex: 10 
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
    borderRadius: 20, 
    marginRight: CARD_SPACING,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cardGradient: { padding: spacing.md, flex: 1 },
  missionCardActive: { borderColor: colors.primaryGreen },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  matchBadge: { backgroundColor: colors.primaryGreen + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  matchTxt: { fontSize: 10, fontWeight: '700', color: colors.primaryGreen },
  distBadge: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  cardArea: { fontSize: 12, color: colors.textSecondary },
  skillsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentBlue },
  skillsLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
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
  detailScroll: { flex: 1 },
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
