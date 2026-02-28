// ============================================================================
// BIOMETRIC AUTHENTICATION SERVICE
// Face ID / Touch ID / Fingerprint authentication
// ============================================================================

import * as LocalAuthentication from 'expo-local-authentication';
import { safeGetItem, safeSetItem } from './safeStorage';
import { setKeychainItem, getKeychainItem, removeKeychainItem } from './secureStorage';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

const BIOMETRIC_ENABLED_KEY = StorageKeys.BIOMETRIC_ENABLED;
const BIOMETRIC_ENROLLED_KEY = StorageKeys.BIOMETRIC_ENROLLED;
const PIN_HASH_KEY = 'embermate_pin_hash';
const PIN_SALT_KEY = 'embermate_pin_salt';
const SESSION_TOKEN_KEY = 'embermate_session_token';
const LAST_ACTIVITY_KEY = StorageKeys.LAST_ACTIVITY;
const AUTO_LOCK_TIMEOUT_KEY = StorageKeys.AUTO_LOCK_TIMEOUT;
const DEFAULT_TIMEOUT = 300; // 5 minutes

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
    logError('biometricAuth.checkBiometricCapabilities', error);
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
    logError('biometricAuth.authenticateWithBiometrics', error);
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
      await safeSetItem(BIOMETRIC_ENABLED_KEY, 'true');
      await safeSetItem(BIOMETRIC_ENROLLED_KEY, 'true');
      return true;
    }

    return false;
  } catch (error) {
    logError('biometricAuth.enableBiometricAuth', error);
    return false;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometricAuth(): Promise<boolean> {
  try {
    await safeSetItem(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  } catch (error) {
    logError('biometricAuth.disableBiometricAuth', error);
    return false;
  }
}

/**
 * Check if biometric auth is enabled
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await safeGetItem<string | null>(BIOMETRIC_ENABLED_KEY, null);
    return enabled === 'true';
  } catch (error) {
    logError('biometricAuth.isBiometricEnabled', error);
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

    const crypto = require('expo-crypto');

    // Generate random salt to prevent rainbow table attacks
    const saltBytes = await crypto.getRandomBytesAsync(16);
    const salt = Array.from(saltBytes as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    // Iterated hash for key stretching (1000 rounds)
    let hash = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      salt + pin
    );
    for (let i = 0; i < 1000; i++) {
      hash = await crypto.digestStringAsync(
        crypto.CryptoDigestAlgorithm.SHA256,
        hash + salt
      );
    }

    await setKeychainItem(PIN_SALT_KEY, salt);
    await setKeychainItem(PIN_HASH_KEY, hash);
    return true;
  } catch (error) {
    logError('biometricAuth.setupPIN', error);
    return false;
  }
}

/**
 * Verify PIN
 */
export async function verifyPIN(pin: string): Promise<boolean> {
  try {
    const storedHash = await getKeychainItem(PIN_HASH_KEY);
    const salt = await getKeychainItem(PIN_SALT_KEY);

    if (!storedHash) {
      return false;
    }

    const crypto = require('expo-crypto');
    let pinHash: string;

    if (salt) {
      // Salted + iterated hash (current format)
      pinHash = await crypto.digestStringAsync(
        crypto.CryptoDigestAlgorithm.SHA256,
        salt + pin
      );
      for (let i = 0; i < 1000; i++) {
        pinHash = await crypto.digestStringAsync(
          crypto.CryptoDigestAlgorithm.SHA256,
          pinHash + salt
        );
      }
    } else {
      // Legacy unsalted hash (will be upgraded on next setupPIN)
      pinHash = await crypto.digestStringAsync(
        crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );
    }

    if (pinHash === storedHash) {
      await updateLastActivity();
      await createSession();
      return true;
    }

    return false;
  } catch (error) {
    logError('biometricAuth.verifyPIN', error);
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
    logError('biometricAuth.hasPIN', error);
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
    const token = Array.from(randomBytes as Uint8Array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    await setKeychainItem(SESSION_TOKEN_KEY, token);
  } catch (error) {
    logError('biometricAuth.createSession', error);
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
    logError('biometricAuth.hasActiveSession', error);
    return false;
  }
}

/**
 * Clear session (logout)
 */
export async function clearSession(): Promise<void> {
  try {
    await removeKeychainItem(SESSION_TOKEN_KEY);
  } catch (error) {
    logError('biometricAuth.clearSession', error);
  }
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await safeSetItem(LAST_ACTIVITY_KEY, timestamp);
  } catch (error) {
    logError('biometricAuth.updateLastActivity', error);
  }
}

/**
 * Get time since last activity (in seconds)
 */
export async function getTimeSinceLastActivity(): Promise<number> {
  try {
    const lastActivity = await safeGetItem<string | null>(LAST_ACTIVITY_KEY, null);

    if (!lastActivity) {
      return Infinity;
    }

    const lastTime = new Date(lastActivity).getTime();
    const now = new Date().getTime();
    return (now - lastTime) / 1000; // Convert to seconds
  } catch (error) {
    logError('biometricAuth.getTimeSinceLastActivity', error);
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
    logError('biometricAuth.shouldLockSession', error);
    return true; // Lock on error for security
  }
}

/**
 * Get the configured auto-lock timeout (in seconds)
 */
export async function getAutoLockTimeout(): Promise<number> {
  try {
    const value = await safeGetItem<string | null>(AUTO_LOCK_TIMEOUT_KEY, null);
    return value ? parseInt(value, 10) : DEFAULT_TIMEOUT;
  } catch (error) {
    logError('biometricAuth.getAutoLockTimeout', error);
    return DEFAULT_TIMEOUT;
  }
}

/**
 * Set the auto-lock timeout (in seconds)
 */
export async function setAutoLockTimeout(seconds: number): Promise<void> {
  try {
    await safeSetItem(AUTO_LOCK_TIMEOUT_KEY, seconds.toString());
  } catch (error) {
    logError('biometricAuth.setAutoLockTimeout', error);
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
    logError('biometricAuth.requireAuthentication', error);
    return false;
  }
}
