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
import { AnimatedTabBar } from './AnimatedTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Home stack — nests AssignmentScreen and AvailabilityScreen as push screens.
 */
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VolunteerHome" component={VolunteerHomeScreen} />
    <Stack.Screen name="Assignments" component={AssignmentScreen} />
    <Stack.Screen name="Availability" component={AvailabilityScreen} />
  </Stack.Navigator>
);

/**
 * Profile stack — AvailabilityScreen also accessible from profile settings.
 */
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VolunteerProfile" component={VolunteerProfileScreen} />
    <Stack.Screen name="Availability" component={AvailabilityScreen} />
  </Stack.Navigator>
);

export const VolunteerNavigator = () => {
  return (
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
};
