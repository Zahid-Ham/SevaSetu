import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DashboardScreen } from '../screens/supervisor/DashboardScreen';
import { CrisisHeatmapScreen } from '../screens/supervisor/CrisisHeatmapScreen';
import { VolunteersScreen } from '../screens/supervisor/VolunteersScreen';
import { ImpactReportsScreen } from '../screens/supervisor/ImpactReportsScreen';
import { SupervisorProfileScreen } from '../screens/supervisor/ProfileScreen';
import { AnimatedTabBar } from './AnimatedTabBar';

const Tab = createBottomTabNavigator();

export const SupervisorNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Crisis Heatmap" component={CrisisHeatmapScreen} />
      <Tab.Screen name="Volunteers" component={VolunteersScreen} />
      <Tab.Screen name="Impact Reports" component={ImpactReportsScreen} />
      <Tab.Screen name="Profile" component={SupervisorProfileScreen} />
    </Tab.Navigator>
  );
};
