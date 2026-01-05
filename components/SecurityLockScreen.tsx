// ============================================================================
// SECURITY LOCK SCREEN
// Biometric/PIN authentication before accessing app
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../app/_theme/theme-tokens';
import {
  authenticateWithBiometrics,
  verifyPIN,
  checkBiometricCapabilities,
  isBiometricEnabled,
  BiometricCapabilities,
} from '../utils/biometricAuth';
import { logLogin } from '../utils/auditLog';

interface SecurityLockScreenProps {
  onUnlock: () => void;
  reason?: string;
}

export default function SecurityLockScreen({
  onUnlock,
  reason = 'Unlock EmberMate',
}: SecurityLockScreenProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    initializeSecurity();
  }, []);

  const initializeSecurity = async () => {
    try {
      const caps = await checkBiometricCapabilities();
      const enabled = await isBiometricEnabled();

      setCapabilities(caps);
      setBiometricEnabled(enabled);

      // Auto-trigger biometric if available and enabled
      if (caps.isAvailable && enabled) {
        handleBiometricAuth();
      } else {
        setShowPinInput(true);
      }
    } catch (error) {
      console.error('Error initializing security:', error);
      setShowPinInput(true);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setLoading(true);
      const success = await authenticateWithBiometrics(reason);

      if (success) {
        await logLogin(true, 'biometric');
        onUnlock();
      } else {
        await logLogin(false, 'biometric');
        setShowPinInput(true);
        Alert.alert(
          'Authentication Failed',
          'Please try again or use your PIN'
        );
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      setShowPinInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    try {
      setLoading(true);
      const success = await verifyPIN(pin);

      if (success) {
        await logLogin(true, 'pin');
        onUnlock();
      } else {
        await logLogin(false, 'pin');
        setAttempts(prev => prev + 1);
        setPin('');

        if (attempts >= 4) {
          Alert.alert(
            'Too Many Attempts',
            'You have exceeded the maximum number of attempts. Please try biometric authentication.',
            [
              {
                text: 'Try Biometric',
                onPress: handleBiometricAuth,
              },
            ]
          );
        } else {
          Alert.alert(
            'Incorrect PIN',
            `Please try again. ${5 - attempts - 1} attempts remaining.`
          );
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Lock Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={80} color={Colors.accent} />
          </View>

          {/* Title */}
          <Text style={styles.title}>EmberMate Locked</Text>
          <Text style={styles.subtitle}>{reason}</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          ) : showPinInput ? (
            <>
              {/* PIN Display */}
              <View style={styles.pinDisplay}>
                {[0, 1, 2, 3, 4, 5].map(index => (
                  <View
                    key={index}
                    style={[
                      styles.pinDot,
                      pin.length > index && styles.pinDotFilled,
                    ]}
                  />
                ))}
              </View>

              {/* PIN Keypad */}
              <View style={styles.keypad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <TouchableOpacity
                    key={digit}
                    style={styles.keypadButton}
                    onPress={() => handlePinKeyPress(digit.toString())}
                  >
                    <Text style={styles.keypadButtonText}>{digit}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.keypadButton}
                  onPress={handlePinBackspace}
                >
                  <Ionicons name="backspace-outline" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keypadButton}
                  onPress={() => handlePinKeyPress('0')}
                >
                  <Text style={styles.keypadButtonText}>0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keypadButton}
                  onPress={handlePinSubmit}
                  disabled={pin.length < 4}
                >
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color={pin.length >= 4 ? Colors.accent : Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.biometricContainer}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
              >
                <Ionicons name="finger-print" size={48} color={Colors.accent} />
                <Text style={styles.biometricText}>
                  Use {capabilities?.biometricName || 'Biometric'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Alternative Auth Methods */}
          <View style={styles.alternatives}>
            {biometricEnabled && showPinInput && (
              <TouchableOpacity
                style={styles.altButton}
                onPress={handleBiometricAuth}
              >
                <Ionicons name="finger-print-outline" size={20} color={Colors.accent} />
                <Text style={styles.altButtonText}>Use Biometric</Text>
              </TouchableOpacity>
            )}

            {!showPinInput && (
              <TouchableOpacity
                style={styles.altButton}
                onPress={() => setShowPinInput(true)}
              >
                <Ionicons name="keypad-outline" size={20} color={Colors.accent} />
                <Text style={styles.altButtonText}>Use PIN</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
    textAlign: 'center',
  },
  loader: {
    marginTop: Spacing.xxxl,
  },

  // PIN Display
  pinDisplay: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  pinDotFilled: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  // Keypad
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: Spacing.md,
  },
  keypadButton: {
    width: 86,
    height: 60,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.textPrimary,
  },

  // Biometric
  biometricContainer: {
    marginTop: Spacing.xxxl,
  },
  biometricButton: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  biometricText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '500',
  },

  // Alternatives
  alternatives: {
    marginTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  altButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  altButtonText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
});
