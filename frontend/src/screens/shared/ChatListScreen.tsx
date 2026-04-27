import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useChatStore } from '../../services/store/useChatStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { useEventStore } from '../../services/store/useEventStore';
import { colors, spacing, typography } from '../../theme';
import { UserAvatar, AppHeader, GradientBackground } from '../../components';

const ChatRoomItem = ({ room, currentUserId, onPress }: { room: any; currentUserId: string; onPress: () => void }) => {
  const isSupervisor = room.supervisor_id === currentUserId;
  const otherName = isSupervisor 
    ? (room.volunteer_name && room.volunteer_name !== 'Me' ? room.volunteer_name : 'Volunteer') 
    : (room.supervisor_name && room.supervisor_name !== 'Me' ? room.supervisor_name : 'Supervisor');
  
  const hasUnread = (room.unread_count || 0) > 0;

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity 
      style={[styles.roomItem, hasUnread && styles.unreadRoomItem]} 
      onPress={onPress}
    >
      <View>
        <UserAvatar name={otherName} size={50} />
        {hasUnread && (
          <View style={styles.unreadBadgeMini}>
            <Text style={styles.unreadBadgeTextMini}>{room.unread_count}</Text>
          </View>
        )}
      </View>
      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={[styles.roomName, hasUnread && styles.unreadText]}>{otherName}</Text>
          <Text style={[styles.roomTime, hasUnread && styles.unreadTime]}>
            {formatTime(room.updated_at)}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text 
            style={[styles.lastMessage, hasUnread && styles.unreadLastMessage]} 
            numberOfLines={1}
          >
            {room.last_message || 'No messages yet'}
          </Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
        {room.event_id && (
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>Mission context active</Text>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={hasUnread ? colors.primaryGreen : colors.textSecondary} />
    </TouchableOpacity>
  );
};

export const ChatListScreen = () => {
  const navigation = useNavigation<any>();
  const { role, user } = useAuthStore();
  const { volunteerId: currentVolunteerId } = useEventStore();
  
  const currentUserId = (role === 'SUPERVISOR' ? user?.id : currentVolunteerId) || '';

  const { rooms, loadRooms, loadingRooms, markRoomRead } = useChatStore();

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        loadRooms(currentUserId);
      }
    }, [currentUserId, loadRooms])
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Messages" />
      
      {loadingRooms ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryGreen} size="large" />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatRoomItem 
              room={item} 
              currentUserId={currentUserId}
              onPress={() => {
                const navName = role === 'SUPERVISOR' 
                  ? (item.volunteer_name && item.volunteer_name !== 'Me' ? item.volunteer_name : 'Volunteer') 
                  : (item.supervisor_name && item.supervisor_name !== 'Me' ? item.supervisor_name : 'Supervisor');
                
                // Mark as read immediately
                markRoomRead(item.id, currentUserId);

                navigation.navigate('Chat', {
                  volunteer_id: item.volunteer_id,
                  supervisor_id: item.supervisor_id,
                  event_id: item.event_id,
                  recipient_name: navName,
                  event_name: item.event_id ? (item.event_name || 'Ongoing Mission') : 'General Inquiry'
                });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={60} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyText}>No conversations yet.</Text>
              <Text style={styles.emptySubtext}>Contact a supervisor from your assignments to start chatting.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roomName: {
    ...typography.headingSmall,
    fontSize: 16,
  },
  roomTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  unreadRoomItem: {
    backgroundColor: colors.primaryGreen + '05',
  },
  unreadText: {
    fontWeight: '800',
    color: '#000',
  },
  unreadLastMessage: {
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  unreadTime: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  unreadBadgeMini: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: colors.primaryGreen,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeTextMini: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryGreen,
    marginLeft: spacing.xs,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryGreen + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventBadgeText: {
    fontSize: 10,
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    ...typography.headingSmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
