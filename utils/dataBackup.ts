// ============================================================================
// DATA BACKUP & RESTORE UTILITIES
// Export and import all app data for backup/transfer
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { Alert } from 'react-native';
import { generateSecureToken } from './secureStorage';
import { logAuditEvent, AuditEventType, AuditSeverity } from './auditLog';
import { logError } from './devLog';

export interface BackupData {
  version: string;
  timestamp: string;
  encrypted?: boolean;
  checksum?: string;
  data: {
    medications: any[];
    medicationLogs: any[];
    appointments: any[];
    patientInfo: any;
    careTeam: any[];
    caregivers: any[];
    settings: any;
  };
}

const BACKUP_VERSION = '1.0.0';

// All storage keys to backup
const STORAGE_KEYS = {
  medications: '@embermate_medications',
  medicationLogs: '@embermate_medication_logs',
  appointments: '@embermate_appointments',
  patientName: '@embermate_patient_name',
  patientInfo: '@embermate_patient_info',
  careTeam: '@embermate_care_team',
  caregivers: '@embermate_caregivers',
  settings: '@EmberMate:settings_modified',
  onboardingComplete: '@embermate_onboarding_complete',
  lastResetDate: '@embermate_last_reset_date',
};

/**
 * Create a backup of all app data
 */
export async function createBackup(): Promise<BackupData | null> {
  try {
    const backup: BackupData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      data: {
        medications: [],
        medicationLogs: [],
        appointments: [],
        patientInfo: {},
        careTeam: [],
        caregivers: [],
        settings: {},
      },
    };

    // Fetch all data from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);

    // Organize data by category
    items.forEach(([key, value]) => {
      if (!value) return;

      try {
        const parsedValue = JSON.parse(value);

        switch (key) {
          case STORAGE_KEYS.medications:
            backup.data.medications = parsedValue;
            break;
          case STORAGE_KEYS.medicationLogs:
            backup.data.medicationLogs = parsedValue;
            break;
          case STORAGE_KEYS.appointments:
            backup.data.appointments = parsedValue;
            break;
          case STORAGE_KEYS.patientInfo:
          case STORAGE_KEYS.patientName:
            backup.data.patientInfo = { ...backup.data.patientInfo, [key]: parsedValue };
            break;
          case STORAGE_KEYS.careTeam:
            backup.data.careTeam = parsedValue;
            break;
          case STORAGE_KEYS.caregivers:
            backup.data.caregivers = parsedValue;
            break;
          default:
            if (key.startsWith('@EmberMate:') || key.startsWith('@embermate_')) {
              backup.data.settings[key] = parsedValue;
            }
        }
      } catch (err) {
        console.warn(`Failed to parse value for key ${key}:`, err);
      }
    });

    return backup;
  } catch (error) {
    logError('dataBackup.createBackup', error);
    return null;
  }
}

// ============================================================================
// Encryption Helpers — AES-256-CBC + PBKDF2 key derivation
// Uses CryptoJS (same library as primary secureStorage encryption)
// ============================================================================

const BACKUP_ENCRYPTION_VERSION = 'v2'; // v2: AES-256-CBC + PBKDF2 (replaces v1 XOR+SHA)
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_SIZE = 256 / 32; // 256-bit key in words

interface EncryptedPayload {
  version: string;
  salt: string;
  iv: string;
  hmac: string;
  data: string;
}

/**
 * Encrypt backup data with AES-256-CBC + PBKDF2 key derivation + HMAC integrity
 */
async function encryptBackup(backup: BackupData, password?: string): Promise<string> {
  try {
    const dataString = JSON.stringify(backup);

    if (!password) {
      return dataString;
    }

    // Generate random salt and IV
    const saltBytes = await Crypto.getRandomBytesAsync(32);
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const salt = CryptoJS.lib.WordArray.create(saltBytes as any);
    const iv = CryptoJS.lib.WordArray.create(ivBytes as any);

    // Derive key using PBKDF2 with 100k iterations
    const derivedKey = CryptoJS.PBKDF2(password, salt, {
      keySize: PBKDF2_KEY_SIZE + (256 / 32), // derive enc key + mac key
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    });

    // Split derived key into encryption key and MAC key
    const encKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, 8)); // 256 bits
    const macKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(8, 16)); // 256 bits

    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(dataString, encKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const ciphertextHex = encrypted.ciphertext.toString();

    // HMAC over ciphertext for integrity (Encrypt-then-MAC)
    const hmac = CryptoJS.HmacSHA256(ciphertextHex, macKey).toString();

    const payload: EncryptedPayload = {
      version: BACKUP_ENCRYPTION_VERSION,
      salt: salt.toString(),
      iv: iv.toString(),
      hmac,
      data: ciphertextHex,
    };

    return JSON.stringify(payload);
  } catch (error) {
    logError('dataBackup.encryptBackup', error);
    throw error;
  }
}

/**
 * Constant-time comparison to prevent timing attacks on HMAC verification
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Decrypt backup data (supports v2 AES and legacy v1 XOR format)
 */
async function decryptBackup(encryptedString: string, password: string): Promise<BackupData | null> {
  try {
    const payload = JSON.parse(encryptedString);

    // v2: AES-256-CBC + PBKDF2
    if (payload.version === BACKUP_ENCRYPTION_VERSION) {
      if (!payload.salt || !payload.iv || !payload.hmac || !payload.data) {
        throw new Error('Invalid encrypted backup format');
      }

      const salt = CryptoJS.enc.Hex.parse(payload.salt);
      const iv = CryptoJS.enc.Hex.parse(payload.iv);

      // Derive key using same PBKDF2 params
      const derivedKey = CryptoJS.PBKDF2(password, salt, {
        keySize: PBKDF2_KEY_SIZE + (256 / 32),
        iterations: PBKDF2_ITERATIONS,
        hasher: CryptoJS.algo.SHA256,
      });

      const encKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, 8));
      const macKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(8, 16));

      // Verify HMAC before decrypting (constant-time comparison)
      const calculatedHmac = CryptoJS.HmacSHA256(payload.data, macKey).toString();
      if (!constantTimeEqual(calculatedHmac, payload.hmac)) {
        throw new Error('Invalid password or corrupted backup');
      }

      // Decrypt
      const ciphertext = CryptoJS.enc.Hex.parse(payload.data);
      const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
      const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    }

    // Legacy v1 format (salt + hmac + data with XOR) — read-only backward compat
    if (payload.salt && payload.hmac && payload.data && !payload.version) {
      return await decryptLegacyBackup(payload, password);
    }

    throw new Error('Unrecognized encrypted backup format');
  } catch (error) {
    logError('dataBackup.decryptBackup', error);
    return null;
  }
}

/**
 * Decrypt legacy v1 backups (XOR + SHA-based KDF) — backward compatibility only
 */
async function decryptLegacyBackup(
  payload: { salt: string; hmac: string; data: string },
  password: string
): Promise<BackupData | null> {
  // Legacy key derivation: 100-iteration SHA-256
  const passwordSuffix = password.substring(0, 8);
  let hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + payload.salt
  );
  for (let i = 0; i < 100; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash + passwordSuffix
    );
  }

  // Legacy XOR decryption
  const keyBytes = new Uint8Array(hash.length / 2);
  for (let i = 0; i < hash.length; i += 2) {
    keyBytes[i / 2] = parseInt(hash.substr(i, 2), 16);
  }

  const encrypted = new Uint8Array(
    atob(payload.data).split('').map(c => c.charCodeAt(0))
  );
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }

  const decryptedString = new TextDecoder().decode(decrypted);
  return JSON.parse(decryptedString);
}

/**
 * Calculate checksum for backup integrity
 */
async function calculateChecksum(data: string): Promise<string> {
  try {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  } catch (error) {
    logError('dataBackup.calculateChecksum', error);
    throw error;
  }
}

/**
 * Export backup data to a JSON file and share it
 */
export async function exportBackup(encrypt: boolean = false, password?: string): Promise<boolean> {
  try {
    const backup = await createBackup();
    if (!backup) {
      throw new Error('Failed to create backup');
    }

    // Add encryption flag and checksum
    if (encrypt && password) {
      backup.encrypted = true;
      const backupString = JSON.stringify(backup.data);
      backup.checksum = await calculateChecksum(backupString);
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `EmberMate-Backup-${timestamp}${encrypt ? '-encrypted' : ''}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Encrypt if requested
    let backupData: string;
    if (encrypt && password) {
      backupData = await encryptBackup(backup, password);
    } else {
      backupData = JSON.stringify(backup, null, 2);
    }

    // Write backup to file
    await FileSystem.writeAsStringAsync(
      fileUri,
      backupData,
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Log audit event
    await logAuditEvent(
      AuditEventType.DATA_BACKUP_CREATED,
      `Backup created${encrypt ? ' (encrypted)' : ''}`,
      AuditSeverity.INFO,
      { filename, encrypted: encrypt }
    );

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export EmberMate Backup',
        UTI: 'public.json',
      });
    } else {
      Alert.alert(
        'Backup Created',
        `Backup saved to:\n${fileUri}\n\nYou can find it in your device's file manager.`
      );
    }

    return true;
  } catch (error) {
    logError('dataBackup.exportBackup', error);
    Alert.alert('Export Failed', 'Could not export backup data. Please try again.');
    return false;
  }
}

/**
 * Restore data from a backup object
 */
export async function restoreFromBackup(backup: BackupData): Promise<boolean> {
  try {
    // Validate backup version
    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup format');
    }

    // Store data back to AsyncStorage
    const storageOperations: Array<[string, string]> = [];

    if (backup.data.medications) {
      storageOperations.push([
        STORAGE_KEYS.medications,
        JSON.stringify(backup.data.medications),
      ]);
    }

    if (backup.data.medicationLogs) {
      storageOperations.push([
        STORAGE_KEYS.medicationLogs,
        JSON.stringify(backup.data.medicationLogs),
      ]);
    }

    if (backup.data.appointments) {
      storageOperations.push([
        STORAGE_KEYS.appointments,
        JSON.stringify(backup.data.appointments),
      ]);
    }

    if (backup.data.patientInfo) {
      Object.entries(backup.data.patientInfo).forEach(([key, value]) => {
        storageOperations.push([key, JSON.stringify(value)]);
      });
    }

    if (backup.data.careTeam) {
      storageOperations.push([
        STORAGE_KEYS.careTeam,
        JSON.stringify(backup.data.careTeam),
      ]);
    }

    if (backup.data.caregivers) {
      storageOperations.push([
        STORAGE_KEYS.caregivers,
        JSON.stringify(backup.data.caregivers),
      ]);
    }

    if (backup.data.settings) {
      Object.entries(backup.data.settings).forEach(([key, value]) => {
        storageOperations.push([key, JSON.stringify(value)]);
      });
    }

    // Execute all storage operations
    await AsyncStorage.multiSet(storageOperations);

    return true;
  } catch (error) {
    logError('dataBackup.restoreFromBackup', error);
    Alert.alert('Restore Failed', 'Could not restore backup data. The backup file may be corrupted.');
    return false;
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  medications: number;
  appointments: number;
  logs: number;
  lastBackup?: string;
} | null> {
  try {
    const backup = await createBackup();
    if (!backup) return null;

    return {
      medications: backup.data.medications?.length || 0,
      appointments: backup.data.appointments?.length || 0,
      logs: backup.data.medicationLogs?.length || 0,
      lastBackup: backup.timestamp,
    };
  } catch (error) {
    logError('dataBackup.getBackupStats', error);
    return null;
  }
}

/**
 * Import and restore from an encrypted backup file
 */
export async function importEncryptedBackup(
  fileContent: string,
  password: string
): Promise<boolean> {
  try {
    // Try to decrypt the backup
    const backup = await decryptBackup(fileContent, password);

    if (!backup) {
      Alert.alert('Restore Failed', 'Invalid password or corrupted backup file.');
      return false;
    }

    // Restore the decrypted backup
    const success = await restoreFromBackup(backup);

    if (success) {
      // Log audit event
      await logAuditEvent(
        AuditEventType.DATA_BACKUP_RESTORED,
        'Encrypted backup restored',
        AuditSeverity.INFO,
        { version: backup.version, timestamp: backup.timestamp }
      );
    }

    return success;
  } catch (error) {
    logError('dataBackup.importEncryptedBackup', error);
    Alert.alert('Import Failed', 'Could not import the backup file. Please check the password and try again.');
    return false;
  }
}

/**
 * Check if a backup file is encrypted
 */
export function isBackupEncrypted(fileContent: string): boolean {
  try {
    const parsed = JSON.parse(fileContent);

    // Check for new encrypted format (has salt and hmac)
    if (parsed.salt && parsed.hmac && parsed.data) {
      return true;
    }

    // Check for old format with encrypted flag
    if (parsed.encrypted === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get backup info from file content without decrypting
 */
export function getBackupPreview(fileContent: string): {
  encrypted: boolean;
  timestamp?: string;
  version?: string;
} | null {
  try {
    const parsed = JSON.parse(fileContent);

    // New encrypted format
    if (parsed.salt && parsed.hmac) {
      return {
        encrypted: true,
        timestamp: undefined,
        version: undefined,
      };
    }

    // Plain backup or old format
    return {
      encrypted: parsed.encrypted || false,
      timestamp: parsed.timestamp,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}

/**
 * Clear all app data (factory reset)
 */
export async function clearAllData(): Promise<boolean> {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    logError('dataBackup.clearAllData', error);
    return false;
  }
}
