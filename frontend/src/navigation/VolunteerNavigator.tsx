import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { VolunteerHomeScreen } from '../screens/volunteer/HomeScreen';
import { TasksMapScreen } from '../screens/volunteer/TasksMapScreen';
import { DigitalSurveyScreen } from '../screens/volunteer/DigitalSurveyScreen';
import { ScanSurveyScreen } from '../screens/volunteer/ScanSurveyScreen';
import { LearningScreen } from '../screens/volunteer/LearningScreen';
import { VolunteerProfileScreen } from '../screens/volunteer/ProfileScreen';
import { AssignmentScreen } from '../screens/volunteer/AssignmentScreen';
import { AvailabilityScreen } from '../screens/volunteer/AvailabilityScreen';
import { CertificatesScreen } from '../screens/volunteer/CertificatesScreen';
import { ChatScreen } from '../screens/shared/ChatScreen';
import { ChatListScreen } from '../screens/shared/ChatListScreen';
import { SyncDashboardScreen } from '../screens/volunteer/SyncDashboardScreen';
import { VerifyCertificateScreen } from '../screens/common/VerifyCertificateScreen';
import { VerifyPassportScreen } from '../screens/common/VerifyPassportScreen';
import { AnimatedTabBar } from './AnimatedTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VolunteerHome" component={VolunteerHomeScreen} />
    <Stack.Screen name="Assignments" component={AssignmentScreen} />
    <Stack.Screen name="Availability" component={AvailabilityScreen} />
    <Stack.Screen name="SyncDashboard" component={SyncDashboardScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VolunteerProfile" component={VolunteerProfileScreen} />
    <Stack.Screen name="Availability" component={AvailabilityScreen} />
    <Stack.Screen name="Certificates" component={CertificatesScreen} />
  </Stack.Navigator>
);

const VolunteerTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <AnimatedTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Tasks Map" component={TasksMapScreen} />
    <Tab.Screen name="Digital Form" component={DigitalSurveyScreen} />
    <Tab.Screen name="Scan Survey" component={ScanSurveyScreen} />
    <Tab.Screen name="Learning" component={LearningScreen} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

export const VolunteerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={VolunteerTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} />
      <Stack.Screen name="VerifyPassport" component={VerifyPassportScreen} />
    </Stack.Navigator>
  );
};
