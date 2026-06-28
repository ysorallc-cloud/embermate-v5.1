// ============================================================================
// SDK 54 — scheduleInstanceNotification passes explicit-undefined Optional<String>
// fields, which the New-Arch native bridge rejects (device error on Mom-profile
// sample-data reload).
//
// The content/trigger object sets Optional<String> fields to an explicit
// `undefined` instead of OMITTING the key. Under the New Architecture,
// `undefined` marshals to `null` and the codegen'd native module rejects it for
// an Optional<String>. The throw is swallowed by scheduleInstanceNotification's
// try/catch → returns null → the reminder is SILENTLY dropped.
//
// TWO named cases (both reproduce the silent drop today):
//   (a) MEDICATION instance — categoryIdentifier='medication' (fine), but on iOS
//       trigger.channelId is explicit undefined. Asserts channelId key OMITTED.
//   (b) WELLNESS instance — the actual non-med type the Mom reload schedules
//       (sample config enables wellness; wellnessSettings default reminderEnabled
//       true). categoryIdentifier is explicit undefined → reproduces the device
//       error verbatim. Asserts categoryIdentifier key OMITTED.
//       (Appointments use a separate path — scheduleAllAppointmentNotifications —
//        so they are NOT the culprit here.)
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { scheduleCarePlanNotifications } from '../../utils/notificationService';
import { getTodayDateString } from '../../services/carePlanGenerator';

// Optional<String> content fields + trigger.channelId the native side treats as
// "omit or string" — an explicit undefined/null is rejected under New Arch.
const OPTIONAL_STRING_CONTENT = ['categoryIdentifier', 'sound', 'subtitle', 'launchImageName'];

function enforceNewArchContract(req: any): void {
  const content = req?.content ?? {};
  for (const k of OPTIONAL_STRING_CONTENT) {
    if (k in content && content[k] === undefined) {
      throw new Error(`[native] Optional<String> content.${k} was passed explicit null`);
    }
  }
  const trigger = req?.trigger ?? {};
  if ('channelId' in trigger && trigger.channelId === undefined) {
    throw new Error('[native] Optional<String> trigger.channelId was passed explicit null');
  }
}

const futureIso = () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // +2h: not past, not quiet hours

const deliveryPrefs = {
  masterEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
} as any;

async function runSchedule(items: any[], instances: any[]) {
  const scheduled = await scheduleCarePlanNotifications('default', items, instances, deliveryPrefs);
  const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
  return { scheduled, req: calls.length ? calls[calls.length - 1][0] : null };
}

describe('SDK 54 — scheduleInstanceNotification Optional<String> null rejection', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios'; // channelId is Android-only → undefined on iOS
    (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async (req: any) => {
      enforceNewArchContract(req);
      return 'mock-notification-id';
    });
  });

  describe('(a) medication instance — iOS trigger.channelId', () => {
    const item = {
      id: 'med-mom-levothyroxine', type: 'medication', name: 'Levothyroxine', active: true,
      notification: { enabled: true, timing: 'at_time', followUp: { enabled: false, intervalMinutes: 30, maxAttempts: 1 } },
    } as any;
    const instance = {
      id: 'inst-mom-levo-am', carePlanItemId: 'med-mom-levothyroxine', itemType: 'medication',
      itemName: 'Levothyroxine', date: getTodayDateString(), status: 'pending',
      scheduledTime: futureIso(), windowLabel: 'morning',
    } as any;

    it('registers the notification (not silently dropped)', async () => {
      const { scheduled } = await runSchedule([item], [instance]);
      expect(scheduled.length).toBeGreaterThanOrEqual(1);
    });

    it('OMITS the trigger.channelId key on iOS (not set to undefined)', async () => {
      const { req } = await runSchedule([item], [instance]);
      expect(req).not.toBeNull();
      expect(req.trigger).not.toHaveProperty('channelId');
    });
  });

  describe('(b) wellness instance — the Mom-reload device error (categoryIdentifier)', () => {
    const item = { id: 'sync-wellness', type: 'wellness', name: 'Wellness check-in', active: true } as any;
    const instance = {
      id: 'inst-mom-wellness-am', carePlanItemId: 'sync-wellness', itemType: 'wellness',
      itemName: 'Wellness check-in', date: getTodayDateString(), status: 'pending',
      scheduledTime: futureIso(), windowLabel: 'morning',
    } as any;

    it('registers the notification (not silently dropped)', async () => {
      const { scheduled } = await runSchedule([item], [instance]);
      expect(scheduled.length).toBeGreaterThanOrEqual(1);
    });

    it('OMITS the content.categoryIdentifier key (not set to undefined)', async () => {
      const { req } = await runSchedule([item], [instance]);
      expect(req).not.toBeNull();
      expect(req.content).not.toHaveProperty('categoryIdentifier');
    });
  });
});
