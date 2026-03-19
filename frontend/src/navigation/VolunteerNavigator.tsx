import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { VolunteerHomeScreen } from '../screens/volunteer/HomeScreen';
import { TasksMapScreen } from '../screens/volunteer/TasksMapScreen';
import { DigitalSurveyScreen } from '../screens/volunteer/DigitalSurveyScreen';
import { ScanSurveyScreen } from '../screens/volunteer/ScanSurveyScreen';
import { LearningScreen } from '../screens/volunteer/LearningScreen';
import { VolunteerProfileScreen } from '../screens/volunteer/ProfileScreen';
import { AnimatedTabBar } from './AnimatedTabBar';

const Tab = createBottomTabNavigator();

export const VolunteerNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={VolunteerHomeScreen} />
      <Tab.Screen name="Tasks Map" component={TasksMapScreen} />
      <Tab.Screen name="Digital Form" component={DigitalSurveyScreen} />
      <Tab.Screen name="Scan Survey" component={ScanSurveyScreen} />
      <Tab.Screen name="Learning" component={LearningScreen} />
      <Tab.Screen name="Profile" component={VolunteerProfileScreen} />
    </Tab.Navigator>
  );
};
