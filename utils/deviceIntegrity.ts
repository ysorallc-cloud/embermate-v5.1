// ============================================================================
// DEVICE INTEGRITY CHECK
// Lightweight jailbreak/root detection — warns but does not block
// ============================================================================

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';

const INTEGRITY_CHECKED_KEY = '@embermate_integrity_checked';

// iOS jailbreak indicator paths — jailbreak-EXCLUSIVE fingerprints only.
// Host-overlapping Unix paths (/bin/bash, /usr/sbin/sshd, /etc/apt) were
// intentionally removed: they exist on the macOS host that the iOS
// simulator inherits from, so they false-positive on every local dev
// build. The three kept here cover the classic jailbreak surface — Cydia
// (the package manager), MobileSubstrate (the tweak runtime), and
// Cydia's apt store directory. Removing any of these three would gut
// the check; adding host-overlapping paths back would re-introduce the
// false-positive class.
const JAILBREAK_PATHS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/private/var/lib/apt/',
];

// Common root indicator paths (Android)
const ROOT_PATHS = [
  '/system/app/Superuser.apk',
  '/sbin/su',
  '/system/bin/su',
  '/system/xbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/system/sd/xbin/su',
];

/**
 * Check if the device appears to be jailbroken/rooted.
 * Uses filesystem path checks — no native library required.
 * Returns true if indicators are found.
 */
export async function checkDeviceIntegrity(): Promise<boolean> {
  try {
    // Dev builds stand down entirely — the bundle + simulator filesystem
    // legitimately look "modified" to filesystem-based probes (host
    // macOS paths overlap with simulator paths), producing false-
    // positives on every `npx expo run:ios`. The probe is a user-facing
    // warning, not a security gate, so suppressing it in dev costs
    // nothing. Production builds (EAS, App Store, TestFlight, local
    // Release) keep running it — `__DEV__` is false there.
    if (__DEV__) return false;

    const paths = Platform.OS === 'ios' ? JAILBREAK_PATHS : ROOT_PATHS;

    for (const path of paths) {
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          return true; // compromised indicator found
        }
      } catch {
        // getInfoAsync may throw on restricted paths — that's expected and OK
      }
    }

    return false;
  } catch (error) {
    logError('deviceIntegrity.checkDeviceIntegrity', error);
    return false; // fail open — don't block legitimate users on detection errors
  }
}

/**
 * Run the integrity check once per install. Returns true if a warning should be shown.
 * Stores the result so users aren't warned repeatedly.
 */
export async function shouldShowIntegrityWarning(): Promise<boolean> {
  try {
    // Same dev-suppression as checkDeviceIntegrity, guarded HERE too so
    // we never write 'clean' to the AsyncStorage cache from a dev run.
    // Otherwise a later production build on the same bundle ID would
    // short-circuit on the dev-written cached verdict and skip the probe
    // entirely — a real correctness bug, not just cosmetic.
    if (__DEV__) return false;

    const alreadyChecked = await safeGetItem<string | null>(INTEGRITY_CHECKED_KEY, null);
    if (alreadyChecked !== null) {
      return alreadyChecked === 'compromised';
    }

    const isCompromised = await checkDeviceIntegrity();
    await safeSetItem(INTEGRITY_CHECKED_KEY, isCompromised ? 'compromised' : 'clean');
    return isCompromised;
  } catch (error) {
    logError('deviceIntegrity.shouldShowIntegrityWarning', error);
    return false;
  }
}
