// __tests__/gates/gateB_noSilentDataLoss.test.ts
// ---------------------------------------------------------------------------
// SAFETY GATE B: a decrypt failure must NOT silently return the default value.
// It must be distinguishable from "no data", it must NOT overwrite the stored
// ciphertext, and a user-controlled backup/export must exist.
//
// This is the highest-stakes gate. Today, getSecureItem() catches decrypt
// errors and does `return defaultValue as T` (utils/secureStorage.ts lines
// ~260 and ~274). That means a corrupted/undecryptable record shows up as an
// empty app with no signal, and there is no cloud backup by design -> silent,
// permanent loss of a caregiver's logged history.
//
// Reproduces today (RED): the "surfaces an error" and "preserves ciphertext"
// tests fail because the current code swallows the error and returns default.
//
// TODO(claude-code): the target API below is a PROPOSAL. Reconcile names with
// the real module. The REQUIRED behavior, however you shape the API, is:
//   (1) a read that hits a decrypt failure does not silently return default;
//       it throws a typed error OR returns a discriminated result
//       { ok:false, reason:'decrypt_failed' }.
//   (2) the original ciphertext is still present after a failed read (not
//       overwritten with the default).
//   (3) an export function produces a blob, and import round-trips it.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO(claude-code): point these at the real modules.
import {
  setSecureItem,
  getSecureItemResult, // NEW: result-returning read the fix must add
} from '../../utils/secureStorage';
import { exportAllData, importAllData } from '../../utils/backup'; // NEW module

const KEY = 'identity:test-record';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Gate B: no silent data loss on decrypt failure', () => {
  it('a decrypt failure is surfaced, not swallowed into the default', async () => {
    await setSecureItem(KEY, { note: 'real caregiver data' });

    // Simulate corruption / a lost-or-rotated key: replace stored ciphertext
    // with a value that cannot be decrypted.
    await AsyncStorage.setItem(KEY, 'not-valid-ciphertext');

    const result = await getSecureItemResult(KEY, { note: 'DEFAULT' });

    // MUST NOT pretend everything is fine by handing back the default.
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('decrypt_failed');
  });

  it('a failed decrypt does not overwrite the stored ciphertext', async () => {
    await setSecureItem(KEY, { note: 'real caregiver data' });
    await AsyncStorage.setItem(KEY, 'not-valid-ciphertext');

    await getSecureItemResult(KEY, { note: 'DEFAULT' });

    // The unreadable blob must still be there so recovery is possible.
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).toBe('not-valid-ciphertext');
  });

  it('a healthy record still reads back correctly', async () => {
    await setSecureItem(KEY, { note: 'real caregiver data' });
    const result = await getSecureItemResult(KEY, { note: 'DEFAULT' });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ note: 'real caregiver data' });
  });

  it('user-controlled backup exists and round-trips', async () => {
    await setSecureItem(KEY, { note: 'real caregiver data' });

    const blob = await exportAllData();
    expect(typeof blob).toBe('string');
    expect(blob.length).toBeGreaterThan(0);

    await AsyncStorage.clear();
    await importAllData(blob);

    const result = await getSecureItemResult(KEY, { note: 'DEFAULT' });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ note: 'real caregiver data' });
  });
});
