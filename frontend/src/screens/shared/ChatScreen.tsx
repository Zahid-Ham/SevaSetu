import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator, 
  Modal,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '../../services/store/useChatStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useEventStore } from '../../services/store/useEventStore';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { UserAvatar, IconButton, GradientBackground } from '../../components';

// ── Components ────────────────────────────────────────────────────────────────

// ── Components ────────────────────────────────────────────────────────────────

const ContextCard = ({ message, isSelf, role }: { message: any; isSelf: boolean; role: string }) => {
  const data = message.metadata || {};
  const isSupervisor = role === 'SUPERVISOR';
  
  return (
    <View style={styles.richContextCard}>
      <LinearGradient 
        colors={isSelf ? ['#1B5E20', '#2E7D32'] : ['#FFFFFF', '#F8F9FA']} 
        style={styles.contextGradient}
      >
        <View style={styles.contextHeader}>
          <View style={[styles.contextIconBg, { backgroundColor: isSelf ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <Feather name="target" size={18} color={isSelf ? '#fff' : colors.primaryGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contextTitle, { color: isSelf ? '#fff' : colors.textPrimary }]}>
              Mission Context Attached
            </Text>
            <Text style={[styles.contextLabel, { color: isSelf ? 'rgba(255,255,255,0.8)' : colors.primaryGreen, fontWeight: '700' }]}>
              {data.event_name || 'Active Mission'}
            </Text>
          </View>
        </View>

        <View style={[styles.contextDivider, { backgroundColor: isSelf ? 'rgba(255,255,255,0.15)' : '#EEE' }]} />

        <View style={styles.contextBody}>
          <Text style={[styles.contextDesc, { color: isSelf ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]} numberOfLines={3}>
            {data.event_description || 'No detailed description provided for this mission context.'}
          </Text>

          <View style={styles.contextInfoRow}>
            <View style={styles.contextStat}>
              <Text style={[styles.contextStatVal, { color: isSelf ? '#fff' : colors.primaryGreen }]}>
                {data.match_score || '85'}%
              </Text>
              <Text style={[styles.contextStatLabel, { color: isSelf ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Match</Text>
            </View>
            <View style={[styles.contextStat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: isSelf ? 'rgba(255,255,255,0.1)' : '#EEE', paddingHorizontal: 15 }]}>
              <Text style={[styles.contextStatVal, { color: isSelf ? '#fff' : colors.primaryGreen }]}>
                {data.area || 'Zone A'}
              </Text>
              <Text style={[styles.contextStatLabel, { color: isSelf ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Area</Text>
            </View>
            <View style={styles.contextStat}>
              <Text style={[styles.contextStatVal, { color: isSelf ? '#fff' : colors.primaryGreen }]}>
                {Array.isArray(data.skills) ? data.skills.length : 2}
              </Text>
              <Text style={[styles.contextStatLabel, { color: isSelf ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Skills</Text>
            </View>
          </View>

          <View style={styles.skillsTagRow}>
            {(data.skills || ['First Aid', 'Logistics']).map((s: string) => (
              <View key={s} style={[styles.miniSkillTag, { backgroundColor: isSelf ? 'rgba(255,255,255,0.15)' : 'rgba(16, 185, 129, 0.08)' }]}>
                <Text style={[styles.miniSkillText, { color: isSelf ? '#fff' : colors.primaryGreen }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const MessageBubble = ({ 
  message, 
  isSelf, 
  role, 
  onLongPress 
}: { 
  message: any; 
  isSelf: boolean; 
  role: string;
  onLongPress?: (msg: any) => void;
}) => {
  const isAttachment = message.type === 'event_attachment';
  const isDeleted = message.deleted;

  if (isAttachment) {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onLongPress={() => onLongPress?.(message)}
        style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper, { maxWidth: '90%' }]}
      >
        <ContextCard message={message} isSelf={isSelf} role={role} />
        <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isSelf ? 'flex-end' : 'flex-start', marginTop: 2 }]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.otherWrapper]}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onLongPress={() => onLongPress?.(message)}
        style={[
          styles.bubble,
          isSelf ? styles.selfBubble : styles.otherBubble,
          isDeleted && { backgroundColor: isSelf ? '#E0E0E0' : '#F5F5F5', borderWidth: 1, borderColor: '#DDD' }
        ]}
      >
        {isSelf && !isDeleted ? (
          <LinearGradient colors={['#1B5E20', '#2E7D32']} style={StyleSheet.absoluteFill} />
        ) : null}
        
        <Text style={[
          styles.messageText, 
          { color: isDeleted ? colors.textSecondary : (isSelf ? '#fff' : colors.textPrimary) },
          isDeleted && { fontStyle: 'italic', fontSize: 13 }
        ]}>
          {isDeleted ? 'This message was deleted' : message.text}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timestamp, { color: isDeleted ? colors.textSecondary : (isSelf ? '#A5D6A7' : colors.textSecondary) }]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export const ChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { 
    volunteer_id, 
    supervisor_id, 
    event_id, 
    recipient_name = 'User',
    event_name = 'General Inquiry'
  } = route.params || {};

  const { role } = useAuthStore();
  const { volunteerId: currentVolunteerId, volunteerProfile } = useEventStore();
  
  // Deterministic current user ID based on role
  const currentUserId = role === 'SUPERVISOR' ? 'sup_deepak_1' : currentVolunteerId;
  const isSupervisor = role === 'SUPERVISOR';
  const myName = isSupervisor ? 'Deepak Supervisor' : (volunteerProfile?.name || 'Volunteer');

  const { 
    messages, 
    loadMessages, 
    loadingMessages,
    sendMessage, 
    startPolling, 
    resetChat,
    generateSummary,
    summary,
    loadingSummary,
    markRoomRead,
    deleteMessage
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  // ⚠️ CRITICAL: Sort participant IDs to match the backend's get_room_id() which uses sorted()
  const sortedParticipants = [volunteer_id, supervisor_id].filter(Boolean).sort();
  const roomId = event_id
    ? `${sortedParticipants.join('_')}_${event_id}`
    : sortedParticipants.join('_');

  useEffect(() => {
    if (!roomId || !currentUserId) return;
    
    loadMessages(roomId, currentUserId);
    // Mark as read in background — don't await, don't block message load
    markRoomRead(roomId, currentUserId).catch(() => {});

    const cleanup = startPolling(roomId, currentUserId);
    return () => {
      cleanup();
      // Don't call resetChat() here — it wipes messages causing blank screen on re-mount
    };
  }, [roomId, currentUserId]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage({
      volunteer_id,
      supervisor_id,
      event_id,
      sender_id: currentUserId,
      text: inputText.trim(),
      volunteer_name: isSupervisor ? recipient_name : myName,
      supervisor_name: isSupervisor ? myName : recipient_name,
      event_name: event_name,
    });
    setInputText('');
  };

  const handleAttachContext = () => {
    // Prevent multiple attachments if the last message was already a context card
    const hasLastContext = messages.length > 0 && messages[messages.length-1].type === 'event_attachment';
    if (hasLastContext) return;

    sendMessage({
      volunteer_id,
      supervisor_id,
      event_id,
      sender_id: currentUserId,
      text: `Mission Context: ${event_name}`,
      type: 'event_attachment',
      volunteer_name: isSupervisor ? recipient_name : myName,
      supervisor_name: isSupervisor ? myName : recipient_name,
      event_name: event_name,
      metadata: route.params.metadata || {
        event_name,
        event_description: 'Mission details related to ' + event_name,
        match_score: 85,
        area: 'Nagpur',
        skills: ['First Aid', 'Logistics']
      }
    });
  };

  const handleLongPress = (msg: any) => {
    if (msg.deleted) return;
    
    const isMyMsg = msg.sender_id === currentUserId;
    
    const options = [
      {
        text: 'Delete for Me',
        onPress: () => deleteMessage(roomId, msg.id, 'for_me', currentUserId),
        style: 'destructive' as 'destructive'
      }
    ];

    if (isMyMsg) {
      options.unshift({
        text: 'Delete for Everyone',
        onPress: () => deleteMessage(roomId, msg.id, 'for_everyone', currentUserId),
        style: 'destructive' as 'destructive'
      });
    }

    Alert.alert(
      'Delete Message?',
      'Are you sure you want to delete this message?',
      [
        ...options,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showContextSuggestion = event_id && messages.length < 5 && !messages.some(m => m.type === 'event_attachment');

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerInfo} 
            onPress={() => setShowProfile(true)}
          >
            <UserAvatar name={recipient_name} size={42} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>{recipient_name}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {event_name || 'General Inquiry'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {isSupervisor && (
            <TouchableOpacity 
              style={styles.summaryAction}
              onPress={() => {
                generateSummary(roomId, event_name);
                setShowSummary(true);
              }}
            >
              <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.summaryIcon}>
                <Feather name="zap" size={18} color={colors.primaryGreen} />
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.moreBtn}>
            <Feather name="more-vertical" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble 
              message={item} 
              isSelf={item.sender_id === currentUserId} 
              role={role!} 
              onLongPress={handleLongPress}
            />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Feather name="message-circle" size={48} color={colors.textSecondary + '50'} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Say hello to start the conversation!</Text>
            </View>
          }
        />
      )}

      {showContextSuggestion && (
        <TouchableOpacity style={styles.suggestionBar} onPress={handleAttachContext}>
          <LinearGradient colors={['#E8F5E9', '#F1F8E9']} style={styles.suggestionGradient}>
            <Feather name="info" size={16} color={colors.primaryGreen} />
            <Text style={styles.suggestionText}>Tap to share Mission details as context</Text>
            <Feather name="chevron-right" size={16} color={colors.primaryGreen} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={[
        styles.inputArea, 
        { paddingBottom: isKeyboardVisible ? spacing.sm : Math.max(insets.bottom, spacing.sm) }
      ]}>
        <View style={styles.inputContainer}>
          {isSupervisor && (
            <TouchableOpacity style={styles.attachBtn} onPress={handleAttachContext}>
              <Feather name="paperclip" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <LinearGradient colors={['#43A047', '#2E7D32']} style={styles.sendGradient}>
              <Feather name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Summary Modal */}
      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.summaryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ Gemini Chat Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(false)} style={styles.modalCloseIcon}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.summaryContent}>
              {loadingSummary ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primaryGreen} size="large" />
                  <Text style={styles.loadingText}>Synthesizing takeaways...</Text>
                </View>
              ) : (
                <Text style={styles.summaryText}>{summary || 'No actionable takeaways found.'}</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setShowSummary(false)}>
              <Text style={styles.modalFooterBtnText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Info Modal */}
      <Modal visible={showProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={() => setShowProfile(false)} 
          />
          <View style={styles.profileModal}>
            <View style={styles.profileBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHero}>
                <UserAvatar name={recipient_name} size={90} />
                <Text style={styles.profileName}>{recipient_name}</Text>
                <Text style={styles.profileRole}>
                  {isSupervisor ? 'Active Volunteer' : 'Mission Supervisor'}
                </Text>
              </View>

              <View style={styles.profileStats}>
                <View style={styles.pStat}>
                  <Text style={styles.pStatVal}>4.8</Text>
                  <Text style={styles.pStatLabel}>Rating</Text>
                </View>
                <View style={[styles.pStat, styles.pStatBorder]}>
                  <Text style={styles.pStatVal}>12</Text>
                  <Text style={styles.pStatLabel}>Missions</Text>
                </View>
                <View style={styles.pStat}>
                  <Text style={styles.pStatVal}>High</Text>
                  <Text style={styles.pStatLabel}>Impact</Text>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.sectionPara}>
                  Dedicated {isSupervisor ? 'volunteer' : 'supervisor'} committed to community development. 
                  Experienced in urban relief and emergency response management.
                </Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>Skills & Expertise</Text>
                <View style={styles.profileSkills}>
                  {['Crisis Management', 'First Aid', 'Logistics', 'Public Safety'].map(s => (
                    <View key={s} style={styles.pSkillTag}>
                      <Text style={styles.pSkillText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.profileActionBtn}
                onPress={() => setShowProfile(false)}
              >
                <Text style={styles.profileActionText}>Close Profile</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...typography.headingSmall,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.captionText,
    color: colors.primaryGreen,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryAction: {
    marginRight: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    padding: 4,
  },
  messageList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  bubbleWrapper: {
    marginBottom: spacing.md,
  },
  selfWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '85%',
    position: 'relative',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selfBubble: {
    borderBottomRightRadius: 4,
    backgroundColor: colors.primaryGreen,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    backgroundColor: '#fff',
  },
  messageText: {
    ...typography.bodyText,
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  richContextCard: {
    width: 300,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    marginVertical: 10,
  },
  contextGradient: {
    padding: spacing.lg,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  contextIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  contextLabel: {
    fontSize: 16,
    marginTop: 2,
  },
  contextDivider: {
    height: 1,
    marginVertical: 15,
  },
  contextBody: {
    gap: 15,
  },
  contextDesc: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contextInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 10,
    borderRadius: 12,
  },
  contextStat: {
    alignItems: 'center',
    flex: 1,
  },
  contextStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  contextStatLabel: {
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniSkillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniSkillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionBar: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  inputArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
    borderRadius: 25,
    paddingHorizontal: 6,
  },
  attachBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    margin: 4,
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  summaryModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '70%',
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...typography.headingSmall,
    color: colors.primaryGreen,
  },
  modalCloseIcon: {
    padding: 8,
  },
  summaryContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 14,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  modalFooterBtn: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalFooterBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  profileModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    height: '85%',
    paddingHorizontal: spacing.xl,
  },
  profileBar: {
    width: 50,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 30,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileName: {
    ...typography.headingMedium,
    marginTop: 16,
    color: colors.textPrimary,
  },
  profileRole: {
    color: colors.primaryGreen,
    fontWeight: '700',
    marginTop: 4,
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 30,
  },
  pStat: {
    flex: 1,
    alignItems: 'center',
  },
  pStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
  },
  pStatVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  sectionPara: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  profileSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pSkillTag: {
    backgroundColor: colors.primaryGreen + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pSkillText: {
    color: colors.primaryGreen,
    fontWeight: '700',
    fontSize: 12,
  },
  profileActionBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  profileActionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyChatSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
