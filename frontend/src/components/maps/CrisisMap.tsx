import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors, spacing, typography, globalStyles } from '../../theme';

export interface Issue {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  summaryField?: string;
  description: string;
  descField?: string;
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
  focusedIssueId = null,
}) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const webViewRef = React.useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const lastPos = await Location.getLastKnownPositionAsync({});
        if (lastPos?.coords) setLocation({ latitude: lastPos.coords.latitude, longitude: lastPos.coords.longitude });
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (pos?.coords) setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {}
    })();
  }, []);

  // When focusedIssueId changes, select that issue
  useEffect(() => {
    if (focusedIssueId) {
      const issue = issues.find(i => i.id === focusedIssueId);
      if (issue) setSelectedIssue(issue);
    }
  }, [focusedIssueId]);

  const centerLat = location?.latitude ?? 19.076;
  const centerLng = location?.longitude ?? 72.8777;

  const getColor = (priority: Issue['priority']) =>
    priority === 'urgent' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#22C55E';

  const markersJs = issues
    .filter(i => !isNaN(i.latitude) && !isNaN(i.longitude))
    .map(issue => `
      L.circleMarker([${issue.latitude}, ${issue.longitude}], {
        radius: 10,
        fillColor: '${getColor(issue.priority)}',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map)
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: '${issue.id}' }));
        })
        .bindPopup(${JSON.stringify(issue.summary || issue.title)});
    `).join('\n');

  const userMarkerJs = location ? `
    L.circleMarker([${centerLat}, ${centerLng}], {
      radius: 12, fillColor: '#1A237E', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map).bindPopup('You are here');
  ` : '';

  const htmlContent = `
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
  <div id="engine-mark">OSM+Leaflet</div>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    ${userMarkerJs}
    ${markersJs}
  </script>
</body>
</html>`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.id) {
        const issue = issues.find(i => i.id === data.id);
        if (issue) {
          setSelectedIssue(issue);
          if (onIssuePress) onIssuePress(issue);
        }
      }
    } catch {}
  };

  const getMarkerColor = (priority: Issue['priority']) =>
    priority === 'urgent' ? colors.error : priority === 'medium' ? colors.warning : colors.success;

  return (
    <View style={styles.container}>
      {!mapLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.navyBlue} />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onLoad={() => setMapLoaded(true)}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
      />
      {!hideDefaultCard && selectedIssue && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[globalStyles.card, styles.detailCard]}
          onPress={() => setSelectedIssue(null)}
        >
          <View style={styles.detailHeader}>
            <View style={[styles.priorityBadge, { backgroundColor: getMarkerColor(selectedIssue.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getMarkerColor(selectedIssue.priority) }]}>
                {selectedIssue.priority.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.coordsText}>
              {selectedIssue.latitude.toFixed(4)}, {selectedIssue.longitude.toFixed(4)}
            </Text>
          </View>
          <Text style={[typography.headingSmall, styles.issueTitle]} numberOfLines={1}>
            {selectedIssue.category ? `${selectedIssue.category}: ` : ''}{selectedIssue.summary || selectedIssue.title}
          </Text>
          <Text style={[typography.bodyText, styles.issueDesc]} numberOfLines={3}>
            {selectedIssue.description}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { width: Dimensions.get('window').width, height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { marginTop: 12, color: colors.navyBlue, fontWeight: '600' },
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
  coordsText: { ...typography.captionText, color: colors.textSecondary, fontSize: 10 },
  priorityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  priorityText: { ...typography.captionText, fontSize: 10, fontWeight: '700' },
  issueTitle: { marginBottom: 2 },
  issueDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
