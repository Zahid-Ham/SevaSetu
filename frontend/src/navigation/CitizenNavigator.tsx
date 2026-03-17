import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

import { HomeScreen } from '../screens/citizen/HomeScreen';
import { ReportIssueScreen } from '../screens/citizen/ReportIssueScreen';
import { MyRequestsScreen } from '../screens/citizen/MyRequestsScreen';
import { ImpactPassportScreen } from '../screens/citizen/ImpactPassportScreen';
import { ProfileScreen as CitizenProfileScreen } from '../screens/citizen/ProfileScreen';

const Tab = createBottomTabNavigator();

export const CitizenNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Report Issue') iconName = 'alert-circle';
          else if (route.name === 'My Requests') iconName = 'list';
          else if (route.name === 'Passport') iconName = 'award';
          else if (route.name === 'Profile') iconName = 'user';
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primarySaffron,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTintColor: colors.textPrimary,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Report Issue" component={ReportIssueScreen} />
      <Tab.Screen name="My Requests" component={MyRequestsScreen} />
      <Tab.Screen name="Passport" component={ImpactPassportScreen} />
      <Tab.Screen name="Profile" component={CitizenProfileScreen} />
    </Tab.Navigator>
  );
};
