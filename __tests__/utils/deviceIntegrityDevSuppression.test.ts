// ============================================================================
// Security hardening — device-integrity probe dev-suppression + path cleanup.
//
// The jailbreak/root probe (utils/deviceIntegrity.ts) fires false-positives
// on dev builds: the simulator inherits the macOS host filesystem, so generic
// Unix paths (/bin/bash, /usr/sbin/sshd, /etc/apt) trigger the "compromised"
// banner on every `npx expo run:ios`. Two linked fixes:
//
//   1. Suppress the probe entirely when __DEV__ is true. Dev builds are
//      legitimately "modified" relative to App Store binaries — running a
//      filesystem-based probe in dev measures the wrong thing. Guard BOTH
//      checkDeviceIntegrity and shouldShowIntegrityWarning so a dev run
//      never writes 'clean' to the AsyncStorage cache (otherwise a later
//      production build on the same bundle ID would short-circuit on the
//      dev-written cache and skip the probe — that's a real correctness
//      bug, not just cosmetic).
//
//   2. Drop the three host-overlap paths (/bin/bash, /usr/sbin/sshd,
//      /etc/apt) from JAILBREAK_PATHS. Keep the three jailbreak-exclusive
//      fingerprints (Cydia.app, MobileSubstrate.dylib, /private/var/lib/apt/).
//
// Tests RED-then-GREEN: three of the six contracts fail against current
// source (no __DEV__ guard exists, dropped paths still in the list); the
// other three are regression guards for production behavior that already
// works and must not break.
// ============================================================================

const mockGetInfoAsync = jest.fn();
const mockSafeGetItem = jest.fn();
const mockSafeSetItem = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// SDK 54 — deviceIntegrity.ts imports FileSystem from 'expo-file-system/legacy';
// mock that subpath so this suite's getInfoAsync spy intercepts the real call.
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: any[]) => mockGetInfoAsync(...args),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: (...args: any[]) => mockSafeGetItem(...args),
  safeSetItem: (...args: any[]) => mockSafeSetItem(...args),
}));

import {
  checkDeviceIntegrity,
  shouldShowIntegrityWarning,
} from '../../utils/deviceIntegrity';

const DROPPED_PATHS = ['/bin/bash', '/usr/sbin/sshd', '/etc/apt'] as const;
const KEPT_PATHS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/private/var/lib/apt/',
] as const;

// Run a callback with __DEV__ pinned to a specific value, then restore.
async function withDev<T>(value: boolean, fn: () => Promise<T>): Promise<T> {
  const original = (global as any).__DEV__;
  (global as any).__DEV__ = value;
  try {
    return await fn();
  } finally {
    (global as any).__DEV__ = original;
  }
}

describe('deviceIntegrity — __DEV__ suppression + path cleanup', () => {
  beforeEach(() => {
    mockGetInfoAsync.mockReset();
    mockSafeGetItem.mockReset();
    mockSafeSetItem.mockReset();
    // Default: filesystem reports nothing exists (clean device).
    mockGetInfoAsync.mockResolvedValue({ exists: false });
    // Default: cache is empty (first-launch behavior).
    mockSafeGetItem.mockResolvedValue(null);
    mockSafeSetItem.mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // RED today — __DEV__ guard does not exist in the source.
  // --------------------------------------------------------------------------

  it('contract 1 (RED): __DEV__=true — checkDeviceIntegrity returns false WITHOUT calling getInfoAsync', async () => {
    await withDev(true, async () => {
      const result = await checkDeviceIntegrity();
      expect(result).toBe(false);
      expect(mockGetInfoAsync).not.toHaveBeenCalled();
    });
  });

  it('contract 2 (RED — cache-pollution pin): __DEV__=true — shouldShowIntegrityWarning returns false WITHOUT writing the cache', async () => {
    // The cache-pollution bug: pre-fix, a dev run wrote `clean` to the shared
    // AsyncStorage cache key, which a later production build on the same
    // bundle ID would short-circuit on. This pin asserts NO write happens
    // from a dev run, so the cache stays untouched until a real prod build
    // populates it.
    await withDev(true, async () => {
      const result = await shouldShowIntegrityWarning();
      expect(result).toBe(false);
      expect(mockSafeSetItem).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // GREEN today (regression guards — production must keep working).
  // --------------------------------------------------------------------------

  it('contract 3 (regression): __DEV__=false — checkDeviceIntegrity DOES call getInfoAsync (production probe runs)', async () => {
    await withDev(false, async () => {
      await checkDeviceIntegrity();
      expect(mockGetInfoAsync).toHaveBeenCalled();
    });
  });

  it('contract 4 (regression): __DEV__=false + Cydia.app exists — returns true (production still detects)', async () => {
    mockGetInfoAsync.mockImplementation(async (path: string) => ({
      exists: path === '/Applications/Cydia.app',
    }));
    await withDev(false, async () => {
      const result = await checkDeviceIntegrity();
      expect(result).toBe(true);
    });
  });

  it('contract 5 (regression): __DEV__=false — all three kept paths are visited', async () => {
    await withDev(false, async () => {
      await checkDeviceIntegrity();
      const calledPaths = mockGetInfoAsync.mock.calls.map((c) => c[0]);
      for (const kept of KEPT_PATHS) {
        expect(calledPaths).toContain(kept);
      }
    });
  });

  // --------------------------------------------------------------------------
  // RED today — dropped paths still in the source.
  // --------------------------------------------------------------------------

  it('contract 6 (RED): __DEV__=false — none of the three host-overlap paths are visited', async () => {
    await withDev(false, async () => {
      await checkDeviceIntegrity();
      const calledPaths = mockGetInfoAsync.mock.calls.map((c) => c[0]);
      for (const dropped of DROPPED_PATHS) {
        expect(calledPaths).not.toContain(dropped);
      }
    });
  });
});
