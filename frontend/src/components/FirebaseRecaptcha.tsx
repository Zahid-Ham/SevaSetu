import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { Modal, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface FirebaseRecaptchaProps {
  firebaseConfig: Record<string, any>;
  attemptInvisibleVerification?: boolean;
}

export interface RecaptchaVerifierHandle {
  type: string;
  verify: () => Promise<string>;
}

/**
 * Custom Firebase Recaptcha Verifier Modal
 * Replaces the deprecated expo-firebase-recaptcha package.
 * Renders Google reCAPTCHA in a WebView and implements the
 * ApplicationVerifier interface expected by Firebase's signInWithPhoneNumber.
 */
export const FirebaseRecaptchaVerifierModal = forwardRef<RecaptchaVerifierHandle, FirebaseRecaptchaProps>(
  ({ firebaseConfig, attemptInvisibleVerification = true }, ref) => {
    const [visible, setVisible] = useState(false);
    const resolveRef = useRef<((token: string) => void) | null>(null);
    const rejectRef = useRef<((error: Error) => void) | null>(null);
    const webViewRef = useRef<WebView>(null);

    const siteKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Google's test key for invisible reCAPTCHA

    const getRecaptchaHTML = useCallback(() => {
      const invisible = attemptInvisibleVerification;
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .container { text-align: center; padding: 20px; }
            .loading { color: #666; font-size: 16px; margin-bottom: 20px; }
          </style>
          <script src="https://www.google.com/recaptcha/api.js?hl=en" async defer></script>
        </head>
        <body>
          <div class="container">
            ${invisible ? '' : '<p class="loading">Please verify you are human</p>'}
            <div
              id="recaptcha-container"
              class="g-recaptcha"
              data-sitekey="${firebaseConfig.apiKey ? siteKey : siteKey}"
              data-size="${invisible ? 'invisible' : 'normal'}"
              data-callback="onVerify"
              data-error-callback="onError"
              data-expired-callback="onExpired"
            ></div>
          </div>
          <script>
            function onVerify(token) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: token }));
            }
            function onError(error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: error }));
            }
            function onExpired() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
            }
            // Auto-execute invisible recaptcha
            ${invisible ? `
              function executeRecaptcha() {
                try {
                  if (typeof grecaptcha !== 'undefined' && grecaptcha.execute) {
                    grecaptcha.execute();
                  } else {
                    setTimeout(executeRecaptcha, 200);
                  }
                } catch(e) {
                  setTimeout(executeRecaptcha, 200);
                }
              }
              // Wait for recaptcha to load then execute
              if (document.readyState === 'complete') {
                setTimeout(executeRecaptcha, 500);
              } else {
                window.addEventListener('load', function() { setTimeout(executeRecaptcha, 500); });
              }
            ` : ''}
          </script>
        </body>
        </html>
      `;
    }, [firebaseConfig, attemptInvisibleVerification, siteKey]);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'verify' && data.token) {
          setVisible(false);
          resolveRef.current?.(data.token);
          resolveRef.current = null;
          rejectRef.current = null;
        } else if (data.type === 'error') {
          setVisible(false);
          rejectRef.current?.(new Error('reCAPTCHA verification failed'));
          resolveRef.current = null;
          rejectRef.current = null;
        } else if (data.type === 'expired') {
          setVisible(false);
          rejectRef.current?.(new Error('reCAPTCHA expired, please try again'));
          resolveRef.current = null;
          rejectRef.current = null;
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    }, []);

    useImperativeHandle(ref, () => ({
      type: 'recaptcha',
      verify: () => {
        return new Promise<string>((resolve, reject) => {
          resolveRef.current = resolve;
          rejectRef.current = reject;
          setVisible(true);
        });
      },
    }));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setVisible(false);
          rejectRef.current?.(new Error('Verification cancelled'));
          resolveRef.current = null;
          rejectRef.current = null;
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Verification</Text>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  rejectRef.current?.(new Error('Verification cancelled'));
                  resolveRef.current = null;
                  rejectRef.current = null;
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <WebView
              ref={webViewRef}
              source={{ html: getRecaptchaHTML() }}
              onMessage={handleMessage}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285F4" />
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    height: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#666',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
