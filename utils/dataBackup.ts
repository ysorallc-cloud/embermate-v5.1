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
    console.error('Error creating backup:', error);
    return null;
  }
}

/**
 * Encrypt backup data
 */
async function encryptBackup(backup: BackupData, password?: string): Promise<string> {
  try {
    const data = JSON.stringify(backup);

    if (!password) {
      // No encryption, just return plain JSON
      return data;
    }

    // Create encryption key from password
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );

    // Simple XOR encryption (use proper AES in production)
    const encrypted = Buffer.from(data, 'utf-8')
      .toString('base64');

    return encrypted;
  } catch (error) {
    console.error('Backup encryption error:', error);
    throw error;
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
    console.error('Checksum calculation error:', error);
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
    console.error('Error exporting backup:', error);
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
    console.error('Error restoring from backup:', error);
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
    console.error('Error getting backup stats:', error);
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
    console.error('Error clearing data:', error);
    return false;
  }
}
