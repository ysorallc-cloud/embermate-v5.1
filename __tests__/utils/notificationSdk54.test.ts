// ============================================================================
// SDK 54 — expo-notifications 0.32 migration guards (Phase 2A).
//
// Two breaking changes the SDK 52->54 bump surfaced:
//   1. NotificationBehavior shape: `shouldShowAlert` is deprecated; the
//      foreground handler must now return `shouldShowBanner` + `shouldShowList`
//      (TS2322 at notificationService.ts setNotificationHandler). If the
//      handler returns the old shape, foreground notifications silently stop
//      showing on SDK 54 — so this asserts the runtime-returned behavior.
//   2. `Notifications.removeNotificationSubscription` was REMOVED; cleanup
//      must call `subscription.remove()` (TS2339 in useNotificationHandler).
//      Source-pinned (mirrors the breathingOrbAnimation29 .remove() pin).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import * as Notifications from 'expo-notifications';

describe('expo-notifications SDK 54 migration (Phase 2A)', () => {
  it('foreground handler returns the SDK-54 NotificationBehavior shape (shouldShowBanner + shouldShowList)', async () => {
    // clearMocks:true wipes the module-load registration before this test;
    // re-require notificationService in an isolated registry to re-run its
    // module-scope setNotificationHandler call on the same mock fn.
    (Notifications.setNotificationHandler as jest.Mock).mockClear();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../utils/notificationService');
    });

    const calls = (Notifications.setNotificationHandler as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const handler = calls[calls.length - 1][0].handleNotification;
    const behavior = await handler();

    // SDK 54 required fields (replace deprecated shouldShowAlert).
    expect(behavior.shouldShowBanner).toBe(true);
    expect(behavior.shouldShowList).toBe(true);
    // Preserved from the SDK 52 handler.
    expect(behavior.shouldPlaySound).toBe(true);
    expect(behavior.shouldSetBadge).toBe(true);
  });

  it('useNotificationHandler cleanup uses subscription.remove(), not the removed removeNotificationSubscription', () => {
    const HOOK_SRC = readFileSync(
      join(__dirname, '../../utils/useNotificationHandler.ts'),
      'utf8',
    );
    // The removed API must not be CALLED (a doc comment may still name it).
    expect(HOOK_SRC).not.toMatch(/Notifications\.removeNotificationSubscription\s*\(/);
    // Cleanup calls .remove() (optional-chaining tolerated, matching the
    // breathingOrbAnimation29 pin).
    expect(HOOK_SRC).toMatch(/\.remove(?:\?\.)?\s*\(\s*\)/);
  });
});
