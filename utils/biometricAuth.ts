// ============================================================================
// BIOMETRIC AUTHENTICATION SERVICE
// Face ID / Touch ID / Fingerprint authentication
// ============================================================================

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setKeychainItem, getKeychainItem } from './secureStorage';

const BIOMETRIC_ENABLED_KEY = '@embermate_biometric_enabled';
const BIOMETRIC_ENROLLED_KEY = '@embermate_biometric_enrolled';
const PIN_HASH_KEY = 'embermate_pin_hash';
const SESSION_TOKEN_KEY = 'embermate_session_token';
const LAST_ACTIVITY_KEY = '@embermate_last_activity';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricName: string;
}

/**
 * Check device biometric capabilities
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricName = 'Biometric';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricName = 'Face ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricName = 'Touch ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricName = 'Iris Scan';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes,
      biometricName,
    };
  } catch (error) {
    console.error('Error checking biometric capabilities:', error);
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricName: 'Biometric',
    };
  }
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to access EmberMate'
): Promise<boolean> {
  try {
    const capabilities = await checkBiometricCapabilities();

    if (!capabilities.isAvailable) {
      console.warn('Biometric authentication not available');
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await updateLastActivity();
      await createSession();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Enable biometric authentication
 */
export async function enableBiometricAuth(): Promise<boolean> {
  try {
    const capabilities = await checkBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return false;
    }

    // Test authentication before enabling
    const authenticated = await authenticateWithBiometrics(
      'Authenticate to enable biometric unlock'
    );

    if (authenticated) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(BIOMETRIC_ENROLLED_KEY, 'true');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error enabling biometric auth:', error);
    return false;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometricAuth(): Promise<boolean> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  } catch (error) {
    console.error('Error disabling biometric auth:', error);
    return false;
  }
}

/**
 * Check if biometric auth is enabled
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled status:', error);
    return false;
  }
}

/**
 * Set up PIN as fallback
 */
export async function setupPIN(pin: string): Promise<boolean> {
  try {
    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    // Hash and store PIN
    const crypto = require('expo-crypto');
    const pinHash = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    await setKeychainItem(PIN_HASH_KEY, pinHash);
    return true;
  } catch (error) {
    console.error('Error setting up PIN:', error);
    return false;
  }
}

/**
 * Verify PIN
 */
export async function verifyPIN(pin: string): Promise<boolean> {
  try {
    const storedHash = await getKeychainItem(PIN_HASH_KEY);

    if (!storedHash) {
      return false;
    }

    const crypto = require('expo-crypto');
    const pinHash = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    if (pinHash === storedHash) {
      await updateLastActivity();
      await createSession();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Check if PIN is set up
 */
export async function hasPIN(): Promise<boolean> {
  try {
    const pinHash = await getKeychainItem(PIN_HASH_KEY);
    return pinHash !== null;
  } catch (error) {
    console.error('Error checking PIN status:', error);
    return false;
  }
}

/**
 * Create authenticated session
 */
async function createSession(): Promise<void> {
  try {
    const crypto = require('expo-crypto');
    const randomBytes = await crypto.getRandomBytesAsync(32);
    const token = Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    await setKeychainItem(SESSION_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error creating session:', error);
  }
}

/**
 * Check if user has active session
 */
export async function hasActiveSession(): Promise<boolean> {
  try {
    const token = await getKeychainItem(SESSION_TOKEN_KEY);
    return token !== null;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

/**
 * Clear session (logout)
 */
export async function clearSession(): Promise<void> {
  try {
    await setKeychainItem(SESSION_TOKEN_KEY, '');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, timestamp);
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
}

/**
 * Get time since last activity (in seconds)
 */
export async function getTimeSinceLastActivity(): Promise<number> {
  try {
    const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);

    if (!lastActivity) {
      return Infinity;
    }

    const lastTime = new Date(lastActivity).getTime();
    const now = new Date().getTime();
    return (now - lastTime) / 1000; // Convert to seconds
  } catch (error) {
    console.error('Error getting time since last activity:', error);
    return Infinity;
  }
}

/**
 * Check if session should be locked (auto-lock after timeout)
 */
export async function shouldLockSession(timeoutSeconds: number = 300): Promise<boolean> {
  try {
    const timeSinceActivity = await getTimeSinceLastActivity();
    return timeSinceActivity > timeoutSeconds;
  } catch (error) {
    console.error('Error checking lock status:', error);
    return true; // Lock on error for security
  }
}

/**
 * Require authentication (biometric or PIN)
 */
export async function requireAuthentication(): Promise<boolean> {
  try {
    // Check if biometric is enabled
    const biometricEnabled = await isBiometricEnabled();

    if (biometricEnabled) {
      const capabilities = await checkBiometricCapabilities();

      if (capabilities.isAvailable) {
        return await authenticateWithBiometrics();
      }
    }

    // Fallback to PIN if available
    const pinExists = await hasPIN();
    if (!pinExists) {
      // No authentication set up
      return true;
    }

    // PIN authentication handled by UI
    return false;
  } catch (error) {
    console.error('Error requiring authentication:', error);
    return false;
  }
}
