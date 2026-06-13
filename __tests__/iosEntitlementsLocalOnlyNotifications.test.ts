// ============================================================================
// iOS ENTITLEMENTS DECLARE NO PUSH CAPABILITY (local-only posture).
//
// Pairs with __tests__/iosManifestLocalOnlyNotifications.test.ts — together
// they pin the no-push posture across BOTH halves of the iOS submission
// surface:
//
//   - Manifest (app.json:expo.ios.infoPlist.UIBackgroundModes) carries no
//     'remote-notification' capability.
//   - Entitlements (ios/EmberMate/EmberMate.entitlements) carries no
//     'aps-environment' key.
//
// Removing the entitlement (rather than flipping development -> production)
// matches the actual product: 100% local notification scheduling via
// expo-notifications' device-local daemon. No APNs token vending, no remote
// push payloads, no push server. Keeping aps-environment under any value
// would imply a push capability the app doesn't use — an App Store review
// signal and a privacy posture mismatch.
//
// CONTRACT BUNDLE
//
//   A. COMMITTED FILE
//      1. ios/EmberMate/EmberMate.entitlements parses as a plist whose
//         root <dict> contains NO 'aps-environment' key.
//
//   B. PREBUILD DEFENSE
//      2. A custom Expo config plugin file exists at
//         plugins/withNoApsEntitlement.js whose body deletes the
//         'aps-environment' key from the entitlements modResults.
//      3. app.json:expo.plugins[] includes './plugins/withNoApsEntitlement'
//         AFTER the expo-notifications plugin block. (expo-notifications'
//         iOS plugin auto-injects aps-environment during `expo prebuild`;
//         our stripper must run after it.)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('iOS entitlements declare no push capability — app is local-only', () => {
  describe('A. Committed entitlements file', () => {
    const ENTITLEMENTS_PATH = join(
      ROOT,
      'ios',
      'EmberMate',
      'EmberMate.entitlements',
    );
    const xml = readFileSync(ENTITLEMENTS_PATH, 'utf8');

    it('the entitlements plist contains no <key>aps-environment</key>', () => {
      // Whitespace-tolerant match against the literal key declaration.
      // We assert ABSENCE so any later regression (manual edit, prebuild
      // re-injection that slipped through) trips this contract.
      expect(xml).not.toMatch(/<key>\s*aps-environment\s*<\/key>/);
    });
  });

  describe('B. Prebuild defense — custom config plugin strips aps re-injection', () => {
    it('plugins/withNoApsEntitlement.js exists and deletes the aps-environment key', () => {
      const pluginPath = join(ROOT, 'plugins', 'withNoApsEntitlement.js');
      const src = readFileSync(pluginPath, 'utf8');
      // The plugin must invoke withEntitlementsPlist (so prebuild's pipeline
      // hands it the parsed entitlements) and must delete the
      // 'aps-environment' key from modResults.
      expect(src).toMatch(/withEntitlementsPlist/);
      expect(src).toMatch(/delete\s+\w+\.modResults\[\s*['"]aps-environment['"]\s*\]/);
    });

    it('app.json plugins[] wires the stripper AFTER the expo-notifications plugin', () => {
      const json = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
      const plugins: any[] = json?.expo?.plugins ?? [];

      // Locate the expo-notifications entry (array form: ["expo-notifications", {...}]).
      const notifIdx = plugins.findIndex(
        (p) => Array.isArray(p) && p[0] === 'expo-notifications',
      );
      expect(notifIdx).toBeGreaterThanOrEqual(0);

      // Locate the stripper plugin entry. Accept either string form
      // ('./plugins/withNoApsEntitlement') or array form with optional props.
      const stripperIdx = plugins.findIndex((p) => {
        const ref = Array.isArray(p) ? p[0] : p;
        return typeof ref === 'string' && /withNoApsEntitlement/.test(ref);
      });
      expect(stripperIdx).toBeGreaterThanOrEqual(0);

      // Order matters: expo-notifications injects, stripper removes.
      expect(stripperIdx).toBeGreaterThan(notifIdx);
    });
  });
});
