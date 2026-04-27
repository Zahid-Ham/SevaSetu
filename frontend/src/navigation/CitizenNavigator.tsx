import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

import { HomeScreen } from '../screens/citizen/HomeScreen';
import { ReportIssueScreen } from '../screens/citizen/ReportIssueScreen';
import { MyRequestsScreen } from '../screens/citizen/MyRequestsScreen';
import { ImpactPassportScreen } from '../screens/citizen/ImpactPassportScreen';
import { ProfileScreen as CitizenProfileScreen } from '../screens/citizen/ProfileScreen';
import { AnimatedTabBar } from './AnimatedTabBar';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VolunteerApplicationScreen } from '../screens/citizen/VolunteerApplicationScreen';
import { VerifyCertificateScreen } from '../screens/common/VerifyCertificateScreen';
import { CitizenReportDetailScreen } from '../screens/citizen/CitizenReportDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CitizenTabs = () => (
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

export const CitizenNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={CitizenTabs} />
      <Stack.Screen name="VolunteerApplication" component={VolunteerApplicationScreen} />
      <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} />
      <Stack.Screen name="CitizenReportDetail" component={CitizenReportDetailScreen} />
    </Stack.Navigator>
  );
};
