// ============================================================================
// iOS MANIFEST — local-only notifications.
//
// EmberMate's notification path is 100% local: the unified scheduler in
// utils/notificationService.ts schedules expo-notifications via the
// device's local notification daemon (iOS UNUserNotificationCenter on
// real devices, Android AlarmManager / NotificationManager). No remote
// push server, no APNs token vending. The pre-2026-06-13 iOS manifest
// nonetheless declared a `UIBackgroundModes: ["remote-notification"]`
// capability — an App Store rejection signal (declaring a capability
// you don't actually use is a documented review-team flag), and it
// implies push when there isn't any.
//
// Two-bundle contract:
//
//   A. iOS manifest — `app.json:expo.ios.infoPlist.UIBackgroundModes`
//      does NOT include the `remote-notification` capability. The whole
//      array is allowed to be omitted entirely; if present, it must
//      not include the retired value.
//
//   B. Regression guard — `utils/notificationService.ts` carries no
//      push-token vending call (`getExpoPushTokenAsync` /
//      `getDevicePushTokenAsync`). Adding either would force the
//      manifest capability back on; keeping the scheduler local-only
//      is the load-bearing rule.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('iOS manifest declares no remote-notification capability — notifications are local-only', () => {
  describe('A. iOS manifest', () => {
    const json = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
    const ios = json?.expo?.ios ?? {};
    const infoPlist = ios.infoPlist ?? {};
    const uiBackgroundModes: string[] = infoPlist.UIBackgroundModes ?? [];

    it('UIBackgroundModes does NOT include "remote-notification"', () => {
      // The whole array may be absent — that's preferable. If present,
      // it must not include the push capability we don't ship.
      expect(uiBackgroundModes).not.toContain('remote-notification');
    });
  });

  describe('C. SDK 54 opt-in vector — enableBackgroundRemoteNotifications stays OFF', () => {
    // SDK 54 / expo-notifications 0.32 gained an `enableBackgroundRemoteNotifications`
    // plugin option (plugin/build/withNotificationsIOS.js). When truthy it
    // injects `UIBackgroundModes: ['remote-notification']` into the PREBUILT
    // Info.plist via withInfoPlist — a vector the entitlements-only
    // withNoApsEntitlement stripper does NOT cover, and which contract A
    // above can't see (it reads app.json source, not prebuild output, and the
    // flag lives in the plugin block, not under expo.ios.infoPlist). The
    // aps-environment entitlement injection is still unconditional (and still
    // stripped), but this new background-mode path would re-introduce the
    // exact remote-notification capability A bans. Keep the opt-in off so the
    // local-only posture holds end-to-end.
    const json = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
    const plugins: any[] = json?.expo?.plugins ?? [];
    const notif = plugins.find(
      (p) => Array.isArray(p) && p[0] === 'expo-notifications',
    );

    it('expo-notifications plugin does not enable enableBackgroundRemoteNotifications', () => {
      const cfg = (notif && notif[1]) || {};
      expect(cfg.enableBackgroundRemoteNotifications).toBeFalsy();
    });
  });

  describe('B. Regression guard — utils/notificationService.ts stays local-only', () => {
    const SRC = readFileSync(
      join(ROOT, 'utils/notificationService.ts'),
      'utf8',
    );
    const STRIPPED = stripComments(SRC);

    it('does not call getExpoPushTokenAsync (Expo push-token vending)', () => {
      expect(STRIPPED).not.toMatch(/\bgetExpoPushTokenAsync\b/);
    });

    it('does not call getDevicePushTokenAsync (raw APNs/FCM token vending)', () => {
      expect(STRIPPED).not.toMatch(/\bgetDevicePushTokenAsync\b/);
    });
  });
});
