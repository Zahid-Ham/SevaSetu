import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { AppHeader, UserAvatar, IconButton } from '../../components';
import { colors, spacing, typography, globalStyles } from '../../theme';

export const VolunteersScreen = () => {
  const volunteers = [
    { id: '1', name: 'Anita Sharma', status: 'Active', zone: 'Sector 5' },
    { id: '2', name: 'Rahul Verma', status: 'On Break', zone: 'Delhi Cantt' },
    { id: '3', name: 'Sneha Patel', status: 'Dispatched', zone: 'Connaught Place' },
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
            <IconButton iconName="message-square" onPress={() => {}} iconColor={colors.accentBlue} />
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
