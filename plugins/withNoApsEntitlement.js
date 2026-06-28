// ============================================================================
// withNoApsEntitlement — Expo config plugin that strips the aps-environment
// key from iOS entitlements during `expo prebuild`.
//
// WHY THIS EXISTS
//
// expo-notifications' iOS plugin auto-injects an `aps-environment` key into
// the entitlements plist on every prebuild via withEntitlementsPlist
// (SDK 54 / expo-notifications 0.32: plugin/build/withNotificationsIOS.js,
//  `config.modResults['aps-environment'] = mode`).
// The aps-environment injection happens UNCONDITIONALLY — there is no opt-out,
// even though EmberMate ships 100% local notification scheduling (no APNs
// token vending, no push payloads). Keeping aps-environment under ANY value
// would imply a push capability the app does not use — an App Store review
// signal and a privacy posture mismatch with our local-only claim.
//
// This plugin must be listed in app.json plugins[] AFTER the
// expo-notifications block so it runs after the injection and strips the
// key from modResults.
//
// SCOPE — this plugin covers ONLY the entitlements half (aps-environment).
// SDK 54 added a SECOND, opt-in vector: when expo-notifications' plugin option
// `enableBackgroundRemoteNotifications` is truthy it injects
// `UIBackgroundModes: ['remote-notification']` into the Info.plist (NOT the
// entitlements), which this stripper does not touch. We keep that option unset
// — pinned by iosManifestLocalOnlyNotifications.test.ts contract C.
//
// PAIRS WITH
//   - app.json:expo.ios.infoPlist — UIBackgroundModes carries no
//     'remote-notification' value (committed in d0db3346).
//   - __tests__/iosManifestLocalOnlyNotifications.test.ts pins the manifest
//     + the SDK-54 enableBackgroundRemoteNotifications opt-in (contract C).
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
