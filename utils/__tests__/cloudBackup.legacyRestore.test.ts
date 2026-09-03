// =============================================================================
// Task 2.5: Verify legacy v1 backup format (from dataBackup.ts) can be
// restored after consolidation into cloudBackup.ts.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem } from '../safeStorage';
import { isEncryptedFormat } from '../secureStorage';

import {
  restoreLegacyBackup,
  isBackupEncrypted,
  getBackupPreview,
  BackupData,
} from '../cloudBackup';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Task 2.5: Legacy v1 backup restore', () => {
  const sampleBackup: BackupData = {
    version: '1.0.0',
    timestamp: '2025-06-15T12:00:00.000Z',
    data: {
      medications: [{ id: '1', name: 'Aspirin', dosage: '81mg' }],
      medicationLogs: [{ id: 'log1', medicationIds: ['1'], timestamp: '2025-06-15T08:00:00Z' }],
      appointments: [{ id: 'appt1', provider: 'Dr. Smith', date: '2025-07-01' }],
      patientInfo: {
        '@embermate_patient_name': 'Alice',
        '@embermate_patient_info': { age: 78 },
      },
      careTeam: [{ id: 'ct1', name: 'Sarah', role: 'Daughter' }],
      caregivers: [],
      settings: {
        '@embermate_theme': 'dark',
      },
    },
  };

  it('restores a plain v1.0.0 BackupData object to AsyncStorage', async () => {
    const success = await restoreLegacyBackup(sampleBackup);
    expect(success).toBe(true);

    // Medications and appointments are sensitive keys — encryption-bypass
    // fix routes them through setSecureItem, so they're no longer raw
    // JSON on disk. Read back via the encrypted primitive instead of raw
    // AsyncStorage + JSON.parse (see the dedicated
    // "Sensitive-key encryption on restore" describe block below for the
    // on-disk ciphertext-format assertion).
    const meds = await safeGetItem('@embermate_medications', null);
    expect(meds).toEqual(sampleBackup.data.medications);

    const appts = await safeGetItem('@embermate_appointments', null);
    expect(appts).toEqual(sampleBackup.data.appointments);

    // Verify patient info keys (also sensitive — same as above)
    const patientName = await safeGetItem('@embermate_patient_name', null);
    expect(patientName).toBe('Alice');

    // Verify careTeam
    const team = await AsyncStorage.getItem('@embermate_care_team');
    expect(team).not.toBeNull();
    expect(JSON.parse(team!)).toEqual(sampleBackup.data.careTeam);

    // Verify settings
    const theme = await AsyncStorage.getItem('@embermate_theme');
    expect(theme).toBe(JSON.stringify('dark'));
  });

  it('rejects invalid backup (missing version or data)', async () => {
    const bad = { timestamp: '2025-01-01' } as any;
    const success = await restoreLegacyBackup(bad);
    expect(success).toBe(false);
  });

  it('handles empty data sections gracefully', async () => {
    const minimal: BackupData = {
      version: '1.0.0',
      timestamp: '2025-01-01T00:00:00Z',
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
    const success = await restoreLegacyBackup(minimal);
    expect(success).toBe(true);
  });

  // ============================================================================
  // Encryption-bypass fix (Sept 2026 audit finding) — restoreLegacyBackup()
  // wrote medications/appointments/patient-name back via raw
  // AsyncStorage.multiSet, bypassing the encrypted-storage layer every other
  // write path (including restoreEncryptedBackup, the sibling restore in
  // this same file) uses for those exact keys.
  // ============================================================================
  describe('Sensitive-key encryption on restore (encryption-bypass fix)', () => {
    const sensitiveBackup: BackupData = {
      version: '1.0.0',
      timestamp: '2025-06-15T12:00:00.000Z',
      data: {
        medications: [{ id: '1', name: 'Warfarin', dosage: '5mg' }],
        medicationLogs: [],
        appointments: [{ id: 'appt1', provider: 'Dr. Chen', date: '2025-07-01' }],
        patientInfo: {
          '@embermate_patient_name': 'Dorothy',
        },
        careTeam: [],
        caregivers: [],
        settings: {},
      },
    };

    // NOTE on this test: secureStorage's decrypt path has a deliberate
    // "soft passthrough" for values that are NOT recognized ciphertext (the
    // encrypt-pii migration contract, for un-migrated bare-string
    // plaintext) — so a sensitive key written as raw plaintext JSON is
    // STILL readable via safeGetItem today, bug or no bug. This assertion
    // is a real regression guard but does NOT discriminate red/green on
    // its own; the next test (raw storage format) is the one that proves
    // the fix, since it does not touch the read-side leniency at all.
    it('sensitive keys are readable via the encrypted read primitive after restore', async () => {
      const success = await restoreLegacyBackup(sensitiveBackup);
      expect(success).toBe(true);

      const meds = await safeGetItem('@embermate_medications', null);
      expect(meds).toEqual(sensitiveBackup.data.medications);

      const appts = await safeGetItem('@embermate_appointments', null);
      expect(appts).toEqual(sensitiveBackup.data.appointments);

      const patientName = await safeGetItem('@embermate_patient_name', null);
      expect(patientName).toBe('Dorothy');
    });

    // THE discriminating test — RED before the fix (raw AsyncStorage read
    // returns plain JSON, isEncryptedFormat === false), GREEN after (the
    // sensitive-key branch routes through setSecureItem, so the raw bytes
    // on disk are v3:iv:ciphertext:tag).
    it('sensitive keys are stored as ciphertext on disk, not plaintext', async () => {
      await restoreLegacyBackup(sensitiveBackup);

      for (const key of [
        '@embermate_medications',
        '@embermate_appointments',
        '@embermate_patient_name',
      ]) {
        const raw = await AsyncStorage.getItem(key);
        expect(raw).not.toBeNull();
        expect(isEncryptedFormat(raw!)).toBe(true);
      }
    });

    it('non-sensitive keys stay plaintext on disk (unaffected by the fix)', async () => {
      const backupWithSettings: BackupData = {
        ...sensitiveBackup,
        data: { ...sensitiveBackup.data, settings: { '@embermate_theme': 'dark' } },
      };
      await restoreLegacyBackup(backupWithSettings);

      const raw = await AsyncStorage.getItem('@embermate_theme');
      expect(raw).not.toBeNull();
      expect(isEncryptedFormat(raw!)).toBe(false);
      expect(JSON.parse(raw!)).toBe('dark');
    });
  });

  describe('isBackupEncrypted', () => {
    it('returns false for a plain v1 backup', () => {
      const content = JSON.stringify(sampleBackup);
      expect(isBackupEncrypted(content)).toBe(false);
    });

    it('returns true for an encrypted payload with salt and hmac', () => {
      const encrypted = JSON.stringify({ salt: 'abc', hmac: 'def', data: 'ghi' });
      expect(isBackupEncrypted(encrypted)).toBe(true);
    });

    it('returns true for a payload with encrypted flag', () => {
      const flagged = JSON.stringify({ ...sampleBackup, encrypted: true });
      expect(isBackupEncrypted(flagged)).toBe(true);
    });
  });

  describe('getBackupPreview', () => {
    it('returns preview for a plain v1 backup', () => {
      const content = JSON.stringify(sampleBackup);
      const preview = getBackupPreview(content);
      expect(preview).not.toBeNull();
      expect(preview!.encrypted).toBe(false);
      expect(preview!.version).toBe('1.0.0');
      expect(preview!.timestamp).toBe('2025-06-15T12:00:00.000Z');
    });

    it('returns null for invalid JSON', () => {
      expect(getBackupPreview('not json')).toBeNull();
    });
  });
});
