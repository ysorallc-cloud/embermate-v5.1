// ============================================================================
// userTenure — install-date based phase resolution. Drives the time-decay
// pattern for educational scaffolding (Prompt 6 Phase 1):
//   • new        — 0–30 days
//   • experienced — 31–90 days
//   • seasoned   — 91+ days
//
// When the install date is missing (e.g. user reset onboarding, restored
// from backup before this field shipped), the service defaults to
// 'experienced' per the Prompt 6 stop condition.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
      return Promise.resolve();
    }),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import {
  getUserTenure,
  markInstalledIfMissing,
  USER_INSTALLED_AT_KEY,
} from '../../services/userTenure';

beforeEach(async () => {
  await (AsyncStorage as any).clear();
});

// safeSetItem JSON.stringifies primitives so the stored value is a quoted
// string. Unwrap before asserting on the timestamp.
const readStoredTimestamp = async (): Promise<string | null> => {
  const raw = await AsyncStorage.getItem(USER_INSTALLED_AT_KEY);
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch (_) {
    return raw;
  }
};

describe('markInstalledIfMissing — write-once', () => {
  it('writes a timestamp on first call', async () => {
    const ms = Date.UTC(2026, 3, 30, 12, 0, 0); // 2026-04-30T12:00:00Z
    await markInstalledIfMissing(ms);
    const stored = await readStoredTimestamp();
    expect(stored).toBe('2026-04-30T12:00:00.000Z');
  });

  it('does not overwrite an existing timestamp', async () => {
    const earliest = Date.UTC(2026, 0, 1, 0, 0, 0);
    const later = Date.UTC(2026, 3, 30, 12, 0, 0);
    await markInstalledIfMissing(earliest);
    await markInstalledIfMissing(later);
    const stored = await readStoredTimestamp();
    expect(stored).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('getUserTenure — phase resolution', () => {
  it('returns "new" for 0–30 days since install', async () => {
    const installed = new Date('2026-04-15T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-04-30T12:00:00'); // 15 days
    const tenure = await getUserTenure(now);
    expect(tenure.days).toBe(15);
    expect(tenure.phase).toBe('new');
  });

  it('boundary: day 30 is still "new"', async () => {
    const installed = new Date('2026-04-01T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-05-01T12:00:00'); // exactly 30 days
    const tenure = await getUserTenure(now);
    expect(tenure.days).toBe(30);
    expect(tenure.phase).toBe('new');
  });

  it('boundary: day 31 flips to "experienced"', async () => {
    const installed = new Date('2026-04-01T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-05-02T12:00:00'); // 31 days
    const tenure = await getUserTenure(now);
    expect(tenure.days).toBe(31);
    expect(tenure.phase).toBe('experienced');
  });

  it('returns "experienced" for 31–90 days', async () => {
    const installed = new Date('2026-02-01T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-04-15T12:00:00'); // ~73 days
    const tenure = await getUserTenure(now);
    expect(tenure.phase).toBe('experienced');
  });

  it('boundary: day 90 is still "experienced"', async () => {
    const installed = new Date('2026-01-01T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-04-01T12:00:00'); // 90 days
    const tenure = await getUserTenure(now);
    expect(tenure.days).toBe(90);
    expect(tenure.phase).toBe('experienced');
  });

  it('boundary: day 91 flips to "seasoned"', async () => {
    const installed = new Date('2026-01-01T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-04-02T12:00:00'); // 91 days
    const tenure = await getUserTenure(now);
    expect(tenure.days).toBe(91);
    expect(tenure.phase).toBe('seasoned');
  });

  it('returns "seasoned" for 91+ days', async () => {
    const installed = new Date('2025-04-30T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, installed.toISOString());
    const now = new Date('2026-04-30T12:00:00'); // 365 days
    const tenure = await getUserTenure(now);
    expect(tenure.days).toBe(365);
    expect(tenure.phase).toBe('seasoned');
  });
});

describe('getUserTenure — defaults when install date is missing', () => {
  it('defaults to "experienced" when no install timestamp exists (Prompt 6 stop condition)', async () => {
    const tenure = await getUserTenure(new Date('2026-04-30T12:00:00'));
    expect(tenure.phase).toBe('experienced');
  });

  it('exposes installedAt as null when missing', async () => {
    const tenure = await getUserTenure(new Date('2026-04-30T12:00:00'));
    expect(tenure.installedAt).toBeNull();
  });

  it('treats malformed stored values as missing (defaults to experienced)', async () => {
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, 'not-a-date');
    const tenure = await getUserTenure(new Date('2026-04-30T12:00:00'));
    expect(tenure.phase).toBe('experienced');
    expect(tenure.installedAt).toBeNull();
  });

  it('treats future install dates as missing (clock skew safety)', async () => {
    const future = new Date('2099-04-30T12:00:00');
    await AsyncStorage.setItem(USER_INSTALLED_AT_KEY, future.toISOString());
    const tenure = await getUserTenure(new Date('2026-04-30T12:00:00'));
    // Future dates are nonsensical; treat as missing rather than negative tenure.
    expect(tenure.phase).toBe('experienced');
  });
});
