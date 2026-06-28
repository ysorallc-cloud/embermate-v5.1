// ============================================================================
// SDK 54 — scheduleOneTimeNotification (the appointment path) has the same
// explicit-undefined Optional<String> bug as scheduleInstanceNotification
// (fixed in fda51d52): sound / categoryIdentifier / trigger.channelId are set
// to explicit undefined instead of being OMITTED, so the New-Arch native bridge
// rejects them → the function's catch swallows the throw → returns null → the
// reminder is SILENTLY dropped.
//
// Cases are driven by the REAL call shapes found in Step 1 (only two callers,
// both appointmentStorage.ts, both pass categoryIdentifier='appointment'):
//   (a)      REAL — appointment, default settings, iOS. Live production drop
//            (categoryIdentifier='appointment' is fine; trigger.channelId is the
//            undefined field on iOS).
//   (b-real) REAL state-variant — appointment, iOS, sound OFF. Reachable via the
//            user's notification settings; content.sound becomes undefined.
//   (c)      DEFENSIVE — no categoryIdentifier passed. NOT reached by any current
//            caller; guards the exported optional-param branch the fix touches.
//            Do not read this as a reproduced production bug.
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { scheduleOneTimeNotification } from '../../utils/notificationService';
import { safeSetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';

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

const futureDate = () => new Date(Date.now() + 26 * 60 * 60 * 1000); // ~1 day out, future

const DEFAULT_SETTINGS = {
  enabled: true,
  reminderMinutesBefore: 0,
  soundEnabled: true,
  vibrationEnabled: true,
  overdueAlertsEnabled: true,
  gracePeriodMinutes: 15,
  overdueAlertMinutes: 30,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

function lastReq(): any {
  const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
  return calls.length ? calls[calls.length - 1][0] : null;
}

describe('SDK 54 — scheduleOneTimeNotification Optional<String> null rejection (appointment path)', () => {
  beforeEach(async () => {
    (Platform as any).OS = 'ios';
    await safeSetItem(StorageKeys.NOTIFICATION_SETTINGS, DEFAULT_SETTINGS); // sound ON by default
    (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async (req: any) => {
      enforceNewArchContract(req);
      return 'mock-notification-id';
    });
  });

  // (a) REAL — the live device drop. categoryIdentifier='appointment' (fine);
  //     trigger.channelId is undefined on iOS → native reject → silent drop.
  describe('(a) appointment, default settings, iOS — REAL production failure', () => {
    const call = () =>
      scheduleOneTimeNotification(
        '📅 Appointment Tomorrow',
        'Cardiology with Dr. Torres at 9:00 AM',
        futureDate(),
        { type: 'appointment_reminder', appointmentId: 'appt-mom-1', timing: '1_day_before' },
        'appointment',
      );

    it('registers the notification (not silently dropped)', async () => {
      const id = await call();
      expect(id).not.toBeNull(); // RED today: catch swallows the throw → null
    });

    it('OMITS trigger.channelId on iOS (not set to undefined)', async () => {
      await call();
      const req = lastReq();
      expect(req).not.toBeNull();
      expect(req.trigger).not.toHaveProperty('channelId');
    });
  });

  // (b-real) REAL state-variant — user turned sound off → content.sound undefined.
  describe('(b-real) appointment, iOS, sound OFF — REAL, reachable via settings', () => {
    beforeEach(async () => {
      await safeSetItem(StorageKeys.NOTIFICATION_SETTINGS, { ...DEFAULT_SETTINGS, soundEnabled: false });
    });

    const call = () =>
      scheduleOneTimeNotification(
        '📅 Appointment in 1 Hour',
        'Cardiology with Dr. Torres',
        futureDate(),
        { type: 'appointment_reminder', appointmentId: 'appt-mom-1', timing: '1_hour_before' },
        'appointment',
      );

    it('registers the notification (not silently dropped)', async () => {
      const id = await call();
      expect(id).not.toBeNull(); // RED today: sound=undefined → native reject → null
    });

    it('OMITS content.sound when sound is off (not set to undefined)', async () => {
      await call();
      const req = lastReq();
      expect(req).not.toBeNull();
      expect(req.content).not.toHaveProperty('sound');
    });
  });

  // (c) DEFENSIVE — NOT a current caller. Both real callers pass 'appointment'.
  //     This only guards the exported optional-param branch (`categoryIdentifier
  //     || undefined`) the fix touches; it is NOT a reproduced production bug.
  describe('(c) no categoryIdentifier — DEFENSIVE guard (no current caller)', () => {
    const call = () =>
      scheduleOneTimeNotification('Reminder', 'body', futureDate(), { type: 'generic' });

    it('OMITS content.categoryIdentifier when none is passed (defensive)', async () => {
      await call();
      const req = lastReq();
      expect(req).not.toBeNull();
      expect(req.content).not.toHaveProperty('categoryIdentifier');
    });
  });
});
