// ============================================================================
// Phase 34 NOT.A2 — medication-form save → rescheduleAllNotifications
// BEHAVIOR pin on the predicate.
//
// GAP being closed (the "I toggled it but nothing fired" trust class):
//   A1 wires per-med notification fields into CarePlanItem.notification
//   so the scheduler can read them — but the scheduler only re-evaluates
//   on the next ensureDailyInstances cycle (cold start, date change,
//   tab focus). A caregiver toggling notificationsEnabled on the existing
//   medication-form sees NO immediate effect on the scheduled queue.
//
//   A2 closes the gap by calling rescheduleAllNotifications() after a
//   save that changed notification-relevant fields. But the predicate
//   matters as much as the call: rescheduleAllNotifications() wipes the
//   ENTIRE notification queue (banked latent trap 3 in
//   project_notification_latent_traps.md — no selective cancel). Calling
//   it on every save would thrash the queue for non-notification edits
//   (e.g., renaming a med, changing dosage). The predicate determines
//   when reschedule is warranted.
//
// HELPER UNDER TEST:
//   medicationNotificationChanged(before, after) — exported from
//   services/carePlanGenerator.ts. Returns true iff
//   buildMedicationNotificationConfig(before) and
//   buildMedicationNotificationConfig(after) differ. before=null is
//   add mode (always returns true; new med means new instance).
//
// LOCK APPLIED:
//   Q-34.NOT.A.1 (a) HONOR STORED VALUES — the predicate uses
//   buildMedicationNotificationConfig which folds in defaults. So
//   a configMed missing reminderTiming compares EQUAL to one with
//   reminderTiming='at_time' (because the default IS 'at_time'). This
//   prevents spurious reschedules when legacy configs (no fields) are
//   compared with explicit-default-set configs.
// ============================================================================

import {
  medicationNotificationChanged,
} from '../../services/carePlanGenerator';
import type { MedicationPlanItem } from '../../types/carePlanConfig';

const NOW = new Date().toISOString();

function baseMed(overrides: Partial<MedicationPlanItem> = {}): MedicationPlanItem {
  return {
    id: 'med-test',
    name: 'Lisinopril',
    dosage: '10mg',
    timesOfDay: ['morning'],
    active: true,
    notificationsEnabled: true,
    reminderTiming: 'at_time',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('Phase 34 NOT.A2 — medicationNotificationChanged predicate', () => {
  it('contract 1 (ADD MODE): before=null → always returns true (new med = new instance to schedule)', () => {
    const result = medicationNotificationChanged(null, baseMed());
    expect(result).toBe(true);
  });

  it('contract 2 (CHANGED enabled): before.notificationsEnabled=true, after=false → true', () => {
    const before = baseMed({ notificationsEnabled: true });
    const after = baseMed({ notificationsEnabled: false });
    expect(medicationNotificationChanged(before, after)).toBe(true);
  });

  it('contract 3 (CHANGED timing): before.reminderTiming="at_time", after="before_15" → true', () => {
    const before = baseMed({ reminderTiming: 'at_time' });
    const after = baseMed({ reminderTiming: 'before_15' });
    expect(medicationNotificationChanged(before, after)).toBe(true);
  });

  it('contract 4 (CHANGED customMinutes): timing=custom, before.minutes=15, after=45 → true', () => {
    const before = baseMed({ reminderTiming: 'custom', reminderCustomMinutes: 15 });
    const after = baseMed({ reminderTiming: 'custom', reminderCustomMinutes: 45 });
    expect(medicationNotificationChanged(before, after)).toBe(true);
  });

  it('contract 5 (UNCHANGED — load-bearing): identical before + after → false (no thrash on non-notification edits)', () => {
    const before = baseMed({
      notificationsEnabled: true,
      reminderTiming: 'before_30',
    });
    const after = baseMed({
      notificationsEnabled: true,
      reminderTiming: 'before_30',
    });
    expect(medicationNotificationChanged(before, after)).toBe(false);
  });

  it('contract 6 (UNCHANGED notification + CHANGED non-notification): name/dosage differ but notification fields identical → false (rename should NOT thrash the queue)', () => {
    // The most common "load-bearing" case. Caregiver edits dosage
    // from 10mg → 20mg without touching reminders. Reschedule would
    // wipe the queue uselessly + reload it identical.
    const before = baseMed({
      name: 'Lisinopril',
      dosage: '10mg',
      notificationsEnabled: true,
      reminderTiming: 'at_time',
    });
    const after = baseMed({
      name: 'Lisinopril',
      dosage: '20mg', // dose changed
      notificationsEnabled: true,
      reminderTiming: 'at_time',
    });
    expect(medicationNotificationChanged(before, after)).toBe(false);
  });

  it('contract 7 (DEFAULTS EQUIVALENCE): legacy before (no reminder fields) vs explicit-default after → false (Q-34.NOT.A.1 honor-stored-values + defaults-fold)', () => {
    // Legacy MedicationPlanItem written before A1 may lack
    // notificationsEnabled / reminderTiming entirely. After A1's
    // buildMedicationNotificationConfig folds in defaults
    // (enabled: true, timing: 'at_time'), an "explicit" form save with
    // reminderEnabled=true + reminderTiming='at_time' should compare
    // EQUAL to the legacy med. No reschedule warranted just because
    // the user opened + saved a legacy med without changing anything.
    const legacy = baseMed({
      notificationsEnabled: undefined,
      reminderTiming: undefined,
    });
    const explicitDefault = baseMed({
      notificationsEnabled: true,
      reminderTiming: 'at_time',
    });
    expect(medicationNotificationChanged(legacy, explicitDefault)).toBe(false);
  });
});
