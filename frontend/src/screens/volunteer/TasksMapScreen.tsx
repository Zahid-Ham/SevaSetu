import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { AppHeader, CrisisMap, PrimaryButton } from '../../components';
import { colors, typography, globalStyles, spacing } from '../../theme';
import { MOCK_MISSIONS, Mission } from '../../services/mock';
import { Issue } from '../../components/maps/CrisisMap';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const AnimatedSuccessIcon = ({ style }: { style?: any }) => {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Ionicons name="checkmark-circle" size={56} color={colors.success} />
    </Animated.View>
  );
};

export const TasksMapScreen = () => {
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [accepted, setAccepted] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Transform Volunteer Missions into the Issue format expected by CrisisMap
  const mapIssues: Issue[] = MOCK_MISSIONS.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    priority: m.urgency === 'High' ? 'urgent' : m.urgency === 'Medium' ? 'medium' : 'resolved',
    latitude: m.latitude,
    longitude: m.longitude,
  }));

  useEffect(() => {
    if (selectedMission) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedMission]);

  const handleIssuePress = (issue: Issue) => {
    const mission = MOCK_MISSIONS.find(m => m.id === issue.id);
    if (mission) {
      setAccepted(false);
      setSelectedMission(mission);
    }
  };

  const handleAcceptMission = () => {
    setAccepted(true);
    // Auto collapse after a moment so user can continue using the map
    setTimeout(() => {
      setSelectedMission(null);
    }, 2500);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Tasks Near You" />
      <View style={styles.mapContainer}>
        {/* Pass hideDefaultCard so CrisisMap doesn't overlay its own bottom sheet */}
        <CrisisMap 
          issues={mapIssues} 
          onIssuePress={handleIssuePress}
          hideDefaultCard={true} 
        />
        
        {/* Sliding Custom Mission Card */}
        <Animated.View style={[
          globalStyles.card, 
          styles.slidingCard, 
          { transform: [{ translateY: slideAnim }] }
        ]}>
          {selectedMission && !accepted ? (
            <>
              <View style={styles.cardHeader}>
                <View style={[styles.urgencyBadge, { backgroundColor: selectedMission.urgency === 'High' ? colors.error : selectedMission.urgency === 'Medium' ? colors.warning : colors.success }]}>
                  <Text style={styles.urgencyText}>{selectedMission.urgency.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMission(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.missionTitle}>{selectedMission.title}</Text>
              
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.distanceText}>Est. 2.4 km away • {selectedMission.location}</Text>
              </View>

              <Text style={styles.descriptionText} numberOfLines={3}>
                {selectedMission.description}
              </Text>

              <PrimaryButton 
                title="Accept Mission" 
                onPress={handleAcceptMission} 
                style={styles.acceptButton} 
                iconName="checkmark-circle"
              />
            </>
          ) : accepted ? (
            <View style={styles.successContainer}>
              <AnimatedSuccessIcon />
              <Text style={styles.successTitle}>Mission Accepted!</Text>
              <Text style={styles.successText}>Head to the location. Coordinator notified.</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden', // to hide the card below viewport initially
  },
  slidingCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 1.5, // accommodate safe viewing area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 20,
    backgroundColor: colors.cardBackground,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    ...typography.captionText,
    color: colors.cardBackground,
    fontWeight: '700',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  missionTitle: {
    ...typography.headingMedium,
    marginBottom: spacing.xs,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  distanceText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  descriptionText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  acceptButton: {
    marginTop: spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  successTitle: {
    ...typography.headingMedium,
    color: colors.success,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  successText: {
    ...typography.bodyText,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
