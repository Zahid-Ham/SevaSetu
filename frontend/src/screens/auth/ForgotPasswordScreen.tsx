import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { firebaseAuthService } from '../../services/auth/firebaseAuthService';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  const handleReset = async () => {
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Please enter your email address.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const result = await firebaseAuthService.sendForgotPasswordEmail(email.trim());
      setStatus({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error) {
      setStatus({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          {status.type && (
            <View style={[
              styles.statusContainer, 
              status.type === 'success' ? styles.successContainer : styles.errorContainer
            ]}>
              <Ionicons 
                name={status.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color={status.type === 'success' ? "#2E7D32" : "#D32F2F"} 
              />
              <Text style={[
                styles.statusText,
                status.type === 'success' ? styles.successText : styles.errorText
              ]}>
                {status.message}
              </Text>
            </View>
          )}

          {status.type === 'success' && (
            <TouchableOpacity 
              style={styles.openEmailButton}
              onPress={() => {
                const url = Platform.OS === 'ios' ? 'message://' : 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end';
                Linking.canOpenURL(url).then((supported: boolean) => {
                  if (supported) {
                    Linking.openURL(url);
                  } else {
                    // Fallback to mailto if intent fails, but intent is standard for Android email apps
                    Linking.openURL('mailto:');
                  }
                });
              }}
            >
              <Ionicons name="mail-open-outline" size={20} color="#1A237E" />
              <Text style={styles.openEmailText}>Open Email App</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.resetButton, loading && styles.disabledButton]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.resetButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleSelectionButton}
            onPress={() => navigation.navigate('RoleSelection')}
          >
            <Text style={styles.roleSelectionText}>Back to Role Selection</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A237E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
    fontWeight: '500',
  },
  errorText: {
    color: '#D32F2F',
  },
  openEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  openEmailText: {
    color: '#1A237E',
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#1A237E',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#9FA8DA',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleSelectionButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelectionText: {
    color: '#1A237E',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
