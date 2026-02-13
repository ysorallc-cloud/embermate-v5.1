// ============================================================================
// DATA BACKUP & RESTORE UTILITIES
// Export and import all app data for backup/transfer
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
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
// Encryption Helpers (Improved from weak Base64 to proper XOR + HMAC)
// ============================================================================

/**
 * Generate random bytes for salt/IV
 */
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  return await Crypto.getRandomBytesAsync(length);
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Derive encryption key from password using iterated hashing
 * Optimized: Reduced iterations and avoid string concatenation memory buildup
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const saltHex = bytesToHex(salt);
  const passwordSuffix = password.substring(0, 8);

  // Start with combined value
  let hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + saltHex
  );

  // Reduced iterations (100 instead of 1000) to prevent memory pressure
  // Each iteration reuses the same variable instead of concatenating
  for (let i = 0; i < 100; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash + passwordSuffix
    );
  }

  return hexToBytes(hash);
}

/**
 * XOR-based encryption with key stretching
 */
function xorEncrypt(data: string, key: Uint8Array): string {
  const dataBytes = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(dataBytes.length);

  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ key[i % key.length];
  }

  return btoa(String.fromCharCode(...encrypted));
}

/**
 * XOR-based decryption
 */
function xorDecrypt(encryptedBase64: string, key: Uint8Array): string {
  const encrypted = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );
  const decrypted = new Uint8Array(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Calculate HMAC for integrity verification
 */
async function calculateHMAC(data: string, key: Uint8Array): Promise<string> {
  const keyHex = bytesToHex(key);
  const combined = keyHex + data;

  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
}

interface EncryptedPayload {
  salt: string;
  hmac: string;
  data: string;
}

/**
 * Encrypt backup data with proper key derivation and integrity verification
 */
async function encryptBackup(backup: BackupData, password?: string): Promise<string> {
  try {
    const dataString = JSON.stringify(backup);

    if (!password) {
      // No encryption, just return plain JSON
      return dataString;
    }

    // Generate random salt
    const salt = await generateRandomBytes(32);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data
    const encryptedData = xorEncrypt(dataString, key);

    // Calculate HMAC for integrity
    const hmac = await calculateHMAC(encryptedData, key);

    // Create encrypted payload
    const payload: EncryptedPayload = {
      salt: bytesToHex(salt),
      hmac,
      data: encryptedData,
    };

    return JSON.stringify(payload);
  } catch (error) {
    logError('dataBackup.encryptBackup', error);
    throw error;
  }
}

/**
 * Decrypt backup data
 */
async function decryptBackup(encryptedString: string, password: string): Promise<BackupData | null> {
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedString);

    if (!payload.salt || !payload.hmac || !payload.data) {
      throw new Error('Invalid encrypted backup format');
    }

    // Derive key from password
    const salt = hexToBytes(payload.salt);
    const key = await deriveKey(password, salt);

    // Verify HMAC
    const calculatedHmac = await calculateHMAC(payload.data, key);
    if (calculatedHmac !== payload.hmac) {
      throw new Error('Invalid password or corrupted backup');
    }

    // Decrypt the data
    const decryptedString = xorDecrypt(payload.data, key);
    return JSON.parse(decryptedString);
  } catch (error) {
    logError('dataBackup.decryptBackup', error);
    return null;
  }
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
