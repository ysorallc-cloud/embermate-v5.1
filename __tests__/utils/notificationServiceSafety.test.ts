// ============================================================================
// 3_POLISH_AND_TESTING Fix 16 — Notification testing
// ============================================================================
//
// 16A (permission flow), 16B (real reminder firing), 16C (background
// behavior) all require a runtime device or simulator. They cannot be
// asserted in jest.
//
// What we CAN lock here are the safety guarantees the production code
// must preserve so the manual checklist passes:
//
//   1. requestNotificationPermissions returns false on denial without
//      throwing — declining gracefully disables reminders without
//      breaking the app
//   2. hasNotificationPermissions returns false on error
//   3. scheduleMedicationNotifications checks permission BEFORE scheduling
//      and bails silently if denied
//   4. The startup flow only requests permission once (NOTIFICATION_
//      PERMISSIONS_ASKED flag) and is wrapped in try/catch
//   5. Notification settings screen exposes a re-request path
//   6. Past-time medications are scheduled for tomorrow, not silently
//      dropped or scheduled in the past
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('notificationService — safety guarantees', () => {
  const src = read('utils/notificationService.ts');

  describe('requestNotificationPermissions', () => {
    function getBody(name: string): string {
      const start = src.indexOf(`export async function ${name}`);
      expect(start).toBeGreaterThan(-1);
      const open = src.indexOf('{', start);
      let depth = 0;
      let i = open;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      return src.slice(open, i + 1);
    }

    const body = getBody('requestNotificationPermissions');

    it('wraps the entire flow in try/catch (denied dialog cannot crash)', () => {
      expect(body).toMatch(/try \{[\s\S]*?\} catch/);
    });

    it('returns false on caught error rather than throwing', () => {
      expect(body).toMatch(/catch \(error\)[\s\S]*?return false/);
    });

    it('checks existing permission status before re-prompting', () => {
      expect(body).toMatch(/getPermissionsAsync/);
      expect(body).toMatch(/existingStatus !== 'granted'/);
    });

    it('returns false when final status is not granted (no throw)', () => {
      expect(body).toMatch(/finalStatus !== 'granted'/);
      expect(body).toMatch(/return false/);
    });

    it('configures the Android notification channel only on Android', () => {
      expect(body).toMatch(/Platform\.OS === 'android'/);
      expect(body).toMatch(/setNotificationChannelAsync\('medication-reminders'/);
    });
  });

  describe('hasNotificationPermissions', () => {
    it('returns false on error rather than throwing (graceful default)', () => {
      const start = src.indexOf('export async function hasNotificationPermissions');
      const block = src.slice(start, start + 400);
      expect(block).toMatch(/try \{/);
      expect(block).toMatch(/catch \(error\)[\s\S]*?return false/);
    });
  });

  describe('scheduleMedicationNotifications', () => {
    function getBody(name: string): string {
      const start = src.indexOf(`export async function ${name}`);
      expect(start).toBeGreaterThan(-1);
      const open = src.indexOf('{', start);
      let depth = 0;
      let i = open;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      return src.slice(open, i + 1);
    }

    const body = getBody('scheduleMedicationNotifications');

    it('checks permission before scheduling', () => {
      expect(body).toMatch(/hasNotificationPermissions\(\)/);
    });

    it('returns early when permission is missing instead of attempting to schedule', () => {
      expect(body).toMatch(/if \(!hasPermission\)[\s\S]*?return;/);
    });

    it('respects the user-toggleable settings.enabled flag', () => {
      expect(body).toMatch(/getNotificationSettings\(\)/);
      expect(body).toMatch(/!settings\.enabled/);
    });

    it('cancels existing scheduled notifications before re-scheduling (no duplicates)', () => {
      expect(body).toMatch(/cancelAllNotifications\(\)/);
    });

    it('only schedules notifications for active medications', () => {
      expect(body).toMatch(/medications\.filter\(m => m\.active\)/);
    });
  });

  describe('past-time scheduling guard', () => {
    it('schedules past-time medication reminders for tomorrow rather than dropping them', () => {
      // Inside the per-medication scheduler, when the computed trigger
      // time is already in the past for today, the code must advance the
      // schedule date by one day. Without this guard, an 8 AM med added
      // at 10 AM would never fire today AND never fire tomorrow.
      const start = src.indexOf('async function scheduleMedicationNotification');
      expect(start).toBeGreaterThan(-1);
      const block = src.slice(start, start + 2000);
      expect(block).toMatch(/scheduleDate <= now/);
      expect(block).toMatch(/scheduleDate\.setDate\(scheduleDate\.getDate\(\) \+ 1\)/);
    });
  });
});

describe('App startup — notification permission request flow', () => {
  const src = read('app/_layout.tsx');

  it('requests notification permissions during startup', () => {
    expect(src).toContain("import { requestNotificationPermissions } from '../utils/notificationService'");
    expect(src).toMatch(/requestNotificationPermissionsOnStartup\(\)/);
  });

  it('only prompts once via the NOTIFICATION_PERMISSIONS_ASKED flag', () => {
    expect(src).toMatch(/StorageKeys\.NOTIFICATION_PERMISSIONS_ASKED/);
    expect(src).toMatch(/if \(!hasAskedBefore\)/);
  });

  it('delays the permission prompt to let UI settle (avoids modal-on-modal)', () => {
    // The comment + setTimeout shape — exact delay value is product
    // judgment, just verify the delay exists.
    expect(src).toMatch(/setTimeout\(async \(\) => \{[\s\S]*?requestNotificationPermissions\(\)/);
  });

  it('permission startup flow is wrapped in try/catch (non-critical)', () => {
    const start = src.indexOf('async function requestNotificationPermissionsOnStartup');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, start + 1500);
    expect(block).toMatch(/try \{/);
    expect(block).toMatch(/catch \(error\)/);
  });

  it('cleans up the notification timer ref on unmount', () => {
    expect(src).toContain('notificationTimerRef.current');
    expect(src).toMatch(/clearTimeout\(notificationTimerRef\.current\)/);
  });
});

describe('Notification settings screen exposes a re-request path', () => {
  const src = read('app/notification-settings.tsx');

  it('imports requestNotificationPermissions', () => {
    expect(src).toMatch(/requestNotificationPermissions/);
  });

  it('calls requestNotificationPermissions when the user toggles permission on', () => {
    expect(src).toMatch(/await requestNotificationPermissions\(\)/);
  });
});

describe('CarePlan reschedule — wired into instance generator', () => {
  const generator = read('services/carePlanGenerator.ts');

  it('imports rescheduleAllNotifications', () => {
    expect(generator).toMatch(/rescheduleAllNotifications/);
  });

  it('reschedules notifications when items change', () => {
    // The generator calls rescheduleAllNotifications after a successful
    // sync that mutates items. Verify the call site exists.
    expect(generator).toMatch(/rescheduleAllNotifications\([^)]*patientId/);
  });
});
