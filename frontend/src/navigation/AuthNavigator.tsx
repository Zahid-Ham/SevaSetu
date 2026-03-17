import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import { LandingScreen } from '../screens/auth/LandingScreen';
import { RoleSelectionScreen } from '../screens/auth/RoleSelectionScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OtpLoginScreen } from '../screens/auth/OtpLoginScreen';

export interface AuthNavProps {
  onSelectRole: (role: 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR') => void;
  hasOnboarded: boolean;
}

const Stack = createNativeStackNavigator();

export const AuthNavigator: React.FC<AuthNavProps> = ({ onSelectRole, hasOnboarded }) => {
  return (
    <Stack.Navigator 
      initialRouteName={hasOnboarded ? "Landing" : "SplashScreen"} 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      {/* We uniquely pass onSelectRole via children since screen props are easier handled this way directly */}
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login">
        {() => <LoginScreen onSelectRole={onSelectRole} />}
      </Stack.Screen>
      <Stack.Screen name="OtpLogin">
        {() => <OtpLoginScreen onSelectRole={onSelectRole} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {() => <RegisterScreen onSelectRole={onSelectRole} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
