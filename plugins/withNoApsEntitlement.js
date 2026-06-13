// ============================================================================
// withNoApsEntitlement — Expo config plugin that strips the aps-environment
// key from iOS entitlements during `expo prebuild`.
//
// WHY THIS EXISTS
//
// expo-notifications' iOS plugin auto-injects an `aps-environment` key into
// the entitlements plist on every prebuild
// (node_modules/expo-notifications/plugin/src/withNotificationsIOS.ts:21).
// The injection happens unconditionally — there is no opt-out, even though
// EmberMate ships 100% local notification scheduling (no APNs token vending,
// no push payloads). Keeping aps-environment under ANY value would imply a
// push capability the app does not use — an App Store review signal and a
// privacy posture mismatch with our local-only claim.
//
// This plugin must be listed in app.json plugins[] AFTER the
// expo-notifications block so it runs after the injection and strips the
// key from modResults.
//
// PAIRS WITH
//   - app.json:expo.ios.infoPlist — UIBackgroundModes carries no
//     'remote-notification' value (committed in d0db3346).
//   - __tests__/iosManifestLocalOnlyNotifications.test.ts pins the manifest.
//   - __tests__/iosEntitlementsLocalOnlyNotifications.test.ts pins this file
//     + its wiring into app.json plugins[].
// ============================================================================

const { withEntitlementsPlist } = require('expo/config-plugins');

const withNoApsEntitlement = (config) => {
  return withEntitlementsPlist(config, (entConfig) => {
    if (entConfig.modResults && entConfig.modResults['aps-environment'] !== undefined) {
      delete entConfig.modResults['aps-environment'];
    }
    return entConfig;
  });
};

module.exports = withNoApsEntitlement;
