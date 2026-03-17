import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

import { DashboardScreen } from '../screens/supervisor/DashboardScreen';
import { CrisisHeatmapScreen } from '../screens/supervisor/CrisisHeatmapScreen';
import { VolunteersScreen } from '../screens/supervisor/VolunteersScreen';
import { ImpactReportsScreen } from '../screens/supervisor/ImpactReportsScreen';
import { SupervisorProfileScreen } from '../screens/supervisor/ProfileScreen';

const Tab = createBottomTabNavigator();

export const SupervisorNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = 'pie-chart';
          else if (route.name === 'Crisis Heatmap') iconName = 'map-pin';
          else if (route.name === 'Volunteers') iconName = 'users';
          else if (route.name === 'Impact Reports') iconName = 'file-text';
          else if (route.name === 'Profile') iconName = 'user';
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accentBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTintColor: colors.textPrimary,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Crisis Heatmap" component={CrisisHeatmapScreen} />
      <Tab.Screen name="Volunteers" component={VolunteersScreen} />
      <Tab.Screen name="Impact Reports" component={ImpactReportsScreen} />
      <Tab.Screen name="Profile" component={SupervisorProfileScreen} />
    </Tab.Navigator>
  );
};
