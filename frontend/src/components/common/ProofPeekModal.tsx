import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MissionTask } from '../../services/api/eventPredictionService';
import { useEventStore } from '../../services/store/useEventStore';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

interface ProofPeekModalProps {
  isVisible: boolean;
  onClose: () => void;
  task: MissionTask | null;
  assignmentId: string;
}

export const ProofPeekModal: React.FC<ProofPeekModalProps> = ({
  isVisible,
  onClose,
  task,
  assignmentId,
}) => {
  const { approveTask, rejectTask, analyzeTask, loadingAction } = useEventStore();
  const [localLoading, setLocalLoading] = useState(false);

  // Zoom Logic
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleApprove = async () => {
    if (!task) return;
    setLocalLoading(true);
    await approveTask(task.id, assignmentId);
    setLocalLoading(false);
    onClose();
  };

  const handleReAnalyze = async () => {
    if (!task) return;
    setLocalLoading(true);
    await analyzeTask(task.id, assignmentId);
    setLocalLoading(false);
  };

  if (!task) return null;

  const aiResult = task.ai_verification;

  const handleReject = async () => {
    if (!task) return;
    setLocalLoading(true);
    try {
      await rejectTask(task.id, assignmentId);
      Alert.alert('Requested', 'Volunteer has been notified to provide new proof.');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to request new proof.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </BlurView>

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Task Proof Review</Text>
              <Text style={styles.headerSubtitle}>{task.description}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* Image Viewer */}
          <View style={styles.imageContainer}>
            <GestureDetector gesture={pinchGesture}>
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Animated.Image
                  source={{ uri: task.proof_url! }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </Animated.View>
            </GestureDetector>
            <View style={styles.zoomHint}>
              <Ionicons name="search" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.zoomText}>Pinch to zoom</Text>
            </View>
          </View>

          {/* AI Guard Details */}
          <View style={styles.aiCard}>
            <View style={styles.glassCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiTitleRow}>
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                  <Text style={styles.aiTitle}>Gemini Guard Verdict</Text>
                </View>
                {aiResult && (
                  <View style={[
                    styles.badge, 
                    { backgroundColor: aiResult.confidence_score > 80 ? '#D1FAE5' : '#FEF3C7' }
                  ]}>
                    <Text style={[styles.badgeText, { color: aiResult.confidence_score > 80 ? '#065F46' : '#92400E' }]}>
                      {aiResult.confidence_score}% Confidence
                    </Text>
                  </View>
                )}
              </View>

              <ScrollView style={styles.aiScroll}>
                {aiResult ? (
                  <>
                    <Text style={styles.aiSummary}>{aiResult.summary}</Text>
                    {aiResult.is_irrelevant && (
                      <View style={styles.warningBox}>
                        <Ionicons name="warning" size={16} color="#B45309" />
                        <Text style={styles.warningText}>AI detected irrelevant content.</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyAi}>
                    <ActivityIndicator color="#64748B" size="small" />
                    <Text style={styles.emptyAiText}>Awaiting AI analysis...</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity 
                style={styles.analyzeButton} 
                onPress={handleReAnalyze}
                disabled={localLoading || loadingAction}
              >
                <Ionicons name="refresh" size={16} color="#64748B" />
                <Text style={styles.analyzeButtonText}>Re-run AI Analysis</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.denyButton} 
              onPress={handleReject}
              disabled={localLoading}
            >
              <Text style={styles.denyButtonText}>Request New Proof</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.approveButton, localLoading && styles.disabledButton]} 
              onPress={handleApprove}
              disabled={localLoading}
            >
              {localLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve & Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Mock LinearGradient if expo-linear-gradient is not used, but let's assume it is
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.95,
    height: height * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  headerTitle: {
    color: '#18181B',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#71717A',
    fontSize: 14,
    width: width * 0.7,
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  zoomText: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 6,
  },
  aiCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  glassCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  aiScroll: {
    maxHeight: 100,
  },
  aiSummary: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyAi: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyAiText: {
    color: '#94A3B8',
    fontSize: 13,
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180, 83, 9, 0.05)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    color: '#B45309',
    fontSize: 12,
    marginLeft: 6,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  analyzeButtonText: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  denyButton: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginRight: 12,
  },
  denyButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
