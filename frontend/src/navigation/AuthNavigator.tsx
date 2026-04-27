import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import { LandingScreen } from '../screens/auth/LandingScreen';
import { RoleSelectionScreen } from '../screens/auth/RoleSelectionScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OtpLoginScreen } from '../screens/auth/OtpLoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { useAuthStore } from '../services/store/useAuthStore';

export interface AuthNavProps {
  hasOnboarded: boolean;
}

const Stack = createNativeStackNavigator();

export const AuthNavigator: React.FC<AuthNavProps> = ({ hasOnboarded }) => {
  const { justLoggedOut, setJustLoggedOut } = useAuthStore();

  React.useEffect(() => {
    if (justLoggedOut) {
      // Reset the flag after it's been used for initial routing
      const timer = setTimeout(() => {
        setJustLoggedOut(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedOut]);

  return (
    <Stack.Navigator 
      initialRouteName={justLoggedOut ? "RoleSelection" : "SplashScreen"} 
      screenOptions={{ headerShown: false }}
    >
      {!justLoggedOut && <Stack.Screen name="SplashScreen" component={SplashScreen} />}
      {!justLoggedOut && <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />}
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};
