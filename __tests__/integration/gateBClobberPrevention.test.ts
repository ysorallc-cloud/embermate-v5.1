// ============================================================================
// Gate B — caller migration, real-world proof.
//
// The gate's own tests prove the result API distinguishes decrypt_failed and
// preserves ciphertext on READ. This proves the migration's actual payoff on
// the WRITE path: a real caller (centralStorage.saveVitalsLog) reading through
// the encryptedGetRaw choke point must NOT silently treat an undecryptable blob
// as "no logs" and overwrite it with [newLog] — the permanent-loss path.
//
// No storage/crypto mocks here: the real AES+HMAC layer runs (crypto-js is real
// in jest; only expo-crypto/secure-store are mocked with in-memory stores), so
// a corrupted ciphertext genuinely fails to decrypt.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey, StorageKeys } from '../../utils/storageKeys';
import { saveVitalsLog, getVitalsLogs } from '../../utils/centralStorage';
import { SecureDecryptError } from '../../utils/secureStorage';

// Dual-write event emission is a non-blocking side effect; stub it out so the
// test exercises only the read-modify-write persistence path.
jest.mock('../../utils/eventEmitter', () => ({
  emitVitalsEvent: jest.fn(),
  emitMoodEvent: jest.fn(),
  emitSleepEvent: jest.fn(),
  emitMealEvent: jest.fn(),
  emitHydrationEvent: jest.fn(),
}));

const KEY = scopedKey(StorageKeys.CENTRAL_VITALS_LOGS, 'default');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Gate B — a decrypt failure must not clobber logged vitals', () => {
  it('saveVitalsLog aborts and PRESERVES the unreadable ciphertext instead of overwriting it', async () => {
    await saveVitalsLog({ timestamp: '2026-03-01T09:00:00Z', systolic: 128, diastolic: 82 });
    const goodCipher = await AsyncStorage.getItem(KEY);
    expect(goodCipher).toBeTruthy();

    // Simulate a lost/rotated key: the stored blob can no longer be decrypted.
    await AsyncStorage.setItem(KEY, 'not-valid-ciphertext');

    // The append MUST surface, not silently succeed by writing [newLog].
    await expect(
      saveVitalsLog({ timestamp: '2026-03-02T09:00:00Z', systolic: 140, diastolic: 90 }),
    ).rejects.toBeInstanceOf(SecureDecryptError);

    // The unreadable blob is still on disk verbatim — recoverable, not destroyed.
    expect(await AsyncStorage.getItem(KEY)).toBe('not-valid-ciphertext');
  });

  it('getVitalsLogs stays resilient ([]) on the same failure without mutating storage', async () => {
    await AsyncStorage.setItem(KEY, 'not-valid-ciphertext');

    const logs = await getVitalsLogs();
    expect(logs).toEqual([]);

    // A read must never destroy data.
    expect(await AsyncStorage.getItem(KEY)).toBe('not-valid-ciphertext');
  });
});
