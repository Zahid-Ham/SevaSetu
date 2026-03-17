import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

import { VolunteerHomeScreen } from '../screens/volunteer/HomeScreen';
import { TasksMapScreen } from '../screens/volunteer/TasksMapScreen';
import { ScanSurveyScreen } from '../screens/volunteer/ScanSurveyScreen';
import { LearningScreen } from '../screens/volunteer/LearningScreen';
import { VolunteerProfileScreen } from '../screens/volunteer/ProfileScreen';

const Tab = createBottomTabNavigator();

export const VolunteerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Tasks Map') iconName = 'map';
          else if (route.name === 'Scan Survey') iconName = 'camera';
          else if (route.name === 'Learning') iconName = 'book-open';
          else if (route.name === 'Profile') iconName = 'user';
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primaryGreen,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={VolunteerHomeScreen} />
      <Tab.Screen name="Tasks Map" component={TasksMapScreen} />
      <Tab.Screen name="Scan Survey" component={ScanSurveyScreen} />
      <Tab.Screen name="Learning" component={LearningScreen} />
      <Tab.Screen name="Profile" component={VolunteerProfileScreen} />
    </Tab.Navigator>
  );
};
