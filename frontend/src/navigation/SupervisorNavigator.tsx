import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DashboardScreen } from '../screens/supervisor/DashboardScreen';
import { CrisisHeatmapScreen } from '../screens/supervisor/CrisisHeatmapScreen';
import { VolunteersScreen } from '../screens/supervisor/VolunteersScreen';
import { ImpactReportsScreen } from '../screens/supervisor/ImpactReportsScreen';
import { SupervisorProfileScreen } from '../screens/supervisor/ProfileScreen';
import { EventForecastScreen } from '../screens/supervisor/EventForecastScreen';
import { AssignmentManagerScreen } from '../screens/supervisor/AssignmentManagerScreen';
import { ManualEventScreen } from '../screens/supervisor/ManualEventScreen';  
import { ChatScreen } from '../screens/shared/ChatScreen';
import { ChatListScreen } from '../screens/shared/ChatListScreen';
import { AnimatedTabBar } from './AnimatedTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SupervisorDashboard" component={DashboardScreen} />
    <Stack.Screen name="EventForecast" component={EventForecastScreen} />
    <Stack.Screen name="AssignmentManager" component={AssignmentManagerScreen} />
    <Stack.Screen name="ManualEvent" component={ManualEventScreen} />
  </Stack.Navigator>
);

const VolunteersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VolunteersList" component={VolunteersScreen} />
    <Stack.Screen name="AssignmentManager" component={AssignmentManagerScreen} />
  </Stack.Navigator>
);

const SupervisorTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <AnimatedTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    <Tab.Screen name="Crisis Heatmap" component={CrisisHeatmapScreen} />
    <Tab.Screen name="Volunteers" component={VolunteersStack} />
    <Tab.Screen name="Impact Reports" component={ImpactReportsScreen} />
    <Tab.Screen name="Profile" component={SupervisorProfileScreen} />
  </Tab.Navigator>
);

export const SupervisorNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={SupervisorTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
    </Stack.Navigator>
  );
};
