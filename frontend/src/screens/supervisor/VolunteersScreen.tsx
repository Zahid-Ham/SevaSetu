import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { AppHeader, UserAvatar, IconButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';

import { useNavigation } from '@react-navigation/native';

export const VolunteersScreen = () => {
  const navigation = useNavigation<any>();
  const volunteers = [
    { id: 'vol_logistics_1', name: 'Anita Sharma', status: 'Active', zone: 'Sector 5' },
    { id: 'vol_medical_1', name: 'Rahul Verma', status: 'On Break', zone: 'Delhi Cantt' },
    { id: 'vol_teaching_1', name: 'Sneha Patel', status: 'Dispatched', zone: 'Connaught Place' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Manage Volunteers" rightIcon="user-plus" onRightPress={() => {}} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {volunteers.map(v => (
          <View key={v.id} style={[globalStyles.card, styles.volunteerCard]}>
            <UserAvatar name={v.name} size={50} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={typography.headingSmall}>{v.name}</Text>
              <Text style={[typography.captionText, { color: v.status === 'Active' ? colors.success : colors.warning }]}>
                {v.status} • {v.zone}
              </Text>
            </View>
            <IconButton 
              iconName="message-square" 
              onPress={() => navigation.navigate('Chat', {
                volunteer_id: v.id,
                supervisor_id: 'sup_deepak_1',
                recipient_name: v.name,
                volunteer_name: v.name,
                supervisor_name: 'Deepak Chawla (Supervisor)',
                event_name: 'General Discussion'
              })} 
              iconColor={colors.accentBlue} 
            />
          </View>
        ))}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  volunteerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
});
