import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

import { HomeScreen } from '../screens/citizen/HomeScreen';
import { ReportIssueScreen } from '../screens/citizen/ReportIssueScreen';
import { MyRequestsScreen } from '../screens/citizen/MyRequestsScreen';
import { ImpactPassportScreen } from '../screens/citizen/ImpactPassportScreen';
import { ProfileScreen as CitizenProfileScreen } from '../screens/citizen/ProfileScreen';
import { AnimatedTabBar } from './AnimatedTabBar';

const Tab = createBottomTabNavigator();

export const CitizenNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Report Issue" component={ReportIssueScreen} />
      <Tab.Screen name="My Requests" component={MyRequestsScreen} />
      <Tab.Screen name="Passport" component={ImpactPassportScreen} />
      <Tab.Screen name="Profile" component={CitizenProfileScreen} />
    </Tab.Navigator>
  );
};
