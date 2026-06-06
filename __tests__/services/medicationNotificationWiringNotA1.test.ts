// ============================================================================
// Phase 34 NOT.A1 — per-med notification wiring BEHAVIOR pin.
//
// GAP being closed (gap C of three in the notification slice):
//
//   MedicationPlanItem.notificationsEnabled / reminderTiming /
//   reminderCustomMinutes are written by medication-form.tsx but NO
//   consumer reads them. The unified scheduler at
//   utils/notificationService.ts:602 (scheduleCarePlanNotifications)
//   reads `item.notification.enabled` — a per-CarePlanItem field — but
//   createCarePlanItemFromConfigMed at services/carePlanGenerator.ts:82
//   does NOT set a notification field on the CarePlanItem it returns.
//   Result: scheduler reads undefined.enabled, silently skips.
//
//   Second wiring gap: the matched-existing-item branch at
//   syncMedicationItemsWithConfig:190-198 only reactivates inactive
//   items. It never updates notification config when the config-side
//   toggle changes. Result: caregiver flips notificationsEnabled on an
//   existing med, change never propagates to the scheduled item.
//
// LOCKS APPLIED:
//
//   Q-34.NOT.A.1 (a) — HONOR STORED VALUES. The data model has
//     reminderTiming + reminderCustomMinutes; the F6 inline meds editor
//     drops them from UI but keeps them in the schema (Q-34.F6.8 lock).
//     The scheduler honors the stored values; F6's "master toggle only"
//     UI implicitly produces "at_time" for new meds via the default.
//
//   Q-34.NOT.A.1 follow-up notice: NotificationConfig.followUp exists
//     on CarePlanItem but the scheduler never reads it (banked as
//     [[project_notification_latent_traps]] trap 5). This wiring sets
//     followUp to DEFAULT_NOTIFICATION_CONFIG.medication.followUp so
//     the field has a sensible default for when the feature is wired,
//     but the slice does NOT close the follow-up gap.
//
// TEST SHAPE:
//
//   Mirrors __tests__/services/syncBucketsInactiveReactivate34F2_1.test.ts
//   seed pattern — device-realistic STATE seeded into mockState, exercised
//   via the real exported entry point (ensureDailyInstances), assertions
//   on the post-sync CarePlanItem (the device-facing layer the scheduler
//   reads from).
//
//   RED before wiring: contracts 1-6 fail because createCarePlanItemFromConfigMed
//   doesn't set notification at all + the sync update path doesn't exist.
//   GREEN after: every contract passes.
// ============================================================================

const mockState: {
  config: any;
  items: any[];
} = {
  config: null,
  items: [],
};

jest.mock('../../storage/carePlanRepo', () => ({
  getActiveCarePlan: jest.fn(async () => ({
    id: 'cp-test',
    patientId: 'default',
    version: 1,
  })),
  listCarePlanItems: jest.fn(async (_id: string, opts?: { activeOnly?: boolean }) => {
    if (opts?.activeOnly) return mockState.items.filter((i) => i.active);
    return [...mockState.items];
  }),
  listDailyInstances: jest.fn(async () => []),
  upsertDailyInstances: jest.fn(async () => {}),
  updateDailyInstanceStatus: jest.fn(async () => {}),
  removeStaleInstances: jest.fn(async () => {}),
  removeStaleWindowInstances: jest.fn(async () => {}),
  upsertCarePlanItem: jest.fn(async (item: any) => {
    const idx = mockState.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) mockState.items[idx] = item;
    else mockState.items.push(item);
  }),
  deleteCarePlanItem: jest.fn(async (id: string) => {
    mockState.items = mockState.items.filter((i) => i.id !== id);
  }),
  createCarePlan: jest.fn(async () => ({
    id: 'cp-test',
    patientId: 'default',
    version: 1,
  })),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/carePlanConfigRepo', () => ({
  getCarePlanConfig: jest.fn(async () => mockState.config),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (_key: string, fallback: any) => fallback),
}));

jest.mock('../../utils/devLog', () => ({
  devLog: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

// Stub the dynamic-imported rescheduleAllNotifications so the sync
// path doesn't try to wire into Expo at test time.
jest.mock('../../utils/notificationService', () => ({
  rescheduleAllNotifications: jest.fn(async () => {}),
  scheduleCarePlanNotifications: jest.fn(async () => {}),
}));

import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';
import { DEFAULT_NOTIFICATION_CONFIG } from '../../utils/notificationDefaults';

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date().toISOString();

function freshConfig(): any {
  return createDefaultCarePlanConfig('default');
}

function configWithMed(med: any): any {
  const base = freshConfig();
  return {
    ...base,
    meds: {
      ...base.meds,
      enabled: true,
      medications: [med],
    },
  };
}

function findMedItem(): any {
  return mockState.items.find((i) => i.type === 'medication');
}

describe('Phase 34 NOT.A1 — per-med notification wiring forwards MedicationPlanItem flags onto CarePlanItem.notification', () => {
  beforeEach(() => {
    mockState.config = null;
    mockState.items = [];
  });

  it('contract 1 (ENABLED FORWARDED): MedicationPlanItem.notificationsEnabled=true → CarePlanItem.notification.enabled=true', async () => {
    mockState.config = configWithMed({
      id: 'med-1',
      name: 'Lisinopril',
      dosage: '10mg',
      timesOfDay: ['morning'],
      active: true,
      notificationsEnabled: true,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await ensureDailyInstances('default', TODAY);

    const item = findMedItem();
    expect(item).toBeDefined();
    expect(item.notification).toBeDefined();
    expect(item.notification.enabled).toBe(true);
  });

  it('contract 2 (DISABLED FORWARDED): MedicationPlanItem.notificationsEnabled=false → CarePlanItem.notification.enabled=false (explicit, not undefined)', async () => {
    // Pinning the EXPLICIT false vs undefined distinction. Today's
    // scheduler skips when notification is missing (undefined chains
    // to undefined.enabled which is falsy). Post-wiring, the field
    // must be explicitly false so future scheduler logic can rely on
    // the field's presence.
    mockState.config = configWithMed({
      id: 'med-2',
      name: 'Aspirin',
      dosage: '81mg',
      timesOfDay: ['morning'],
      active: true,
      notificationsEnabled: false,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await ensureDailyInstances('default', TODAY);

    const item = findMedItem();
    expect(item).toBeDefined();
    expect(item.notification).toBeDefined();
    expect(item.notification.enabled).toBe(false);
  });

  it('contract 3 (TIMING FORWARDED): MedicationPlanItem.reminderTiming="before_15" → CarePlanItem.notification.timing="before_15"', async () => {
    mockState.config = configWithMed({
      id: 'med-3',
      name: 'Metformin',
      dosage: '500mg',
      timesOfDay: ['morning', 'evening'],
      active: true,
      notificationsEnabled: true,
      reminderTiming: 'before_15',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await ensureDailyInstances('default', TODAY);

    const item = findMedItem();
    expect(item).toBeDefined();
    expect(item.notification.timing).toBe('before_15');
  });

  it('contract 4 (CUSTOM MINUTES FORWARDED): reminderTiming="custom" + reminderCustomMinutes=45 → notification.timing="custom" + customMinutesBefore=45', async () => {
    mockState.config = configWithMed({
      id: 'med-4',
      name: 'Levothyroxine',
      dosage: '50mcg',
      timesOfDay: ['morning'],
      active: true,
      notificationsEnabled: true,
      reminderTiming: 'custom',
      reminderCustomMinutes: 45,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await ensureDailyInstances('default', TODAY);

    const item = findMedItem();
    expect(item).toBeDefined();
    expect(item.notification.timing).toBe('custom');
    expect(item.notification.customMinutesBefore).toBe(45);
  });

  it('contract 5 (DEFAULTS APPLIED): MedicationPlanItem with no notification fields → notification defaults from DEFAULT_NOTIFICATION_CONFIG.medication', async () => {
    // Hide-not-delete for legacy configs predating the per-med
    // notification fields: scheduler still gets a sensible default
    // shape, not a missing field.
    mockState.config = configWithMed({
      id: 'med-5',
      name: 'Atorvastatin',
      dosage: '20mg',
      timesOfDay: ['evening'],
      active: true,
      // NO notificationsEnabled / reminderTiming / reminderCustomMinutes
      createdAt: NOW,
      updatedAt: NOW,
    });

    await ensureDailyInstances('default', TODAY);

    const item = findMedItem();
    expect(item).toBeDefined();
    expect(item.notification).toBeDefined();
    // Default for meds: enabled true, timing at_time
    expect(item.notification.enabled).toBe(DEFAULT_NOTIFICATION_CONFIG.medication.enabled);
    expect(item.notification.timing).toBe(DEFAULT_NOTIFICATION_CONFIG.medication.timing);
    // followUp shape is preserved from defaults (slice does NOT wire
    // follow-up — see project_notification_latent_traps trap 5)
    expect(item.notification.followUp).toEqual(
      DEFAULT_NOTIFICATION_CONFIG.medication.followUp,
    );
  });

  it('contract 6 (UPDATE PATH): pre-existing CarePlanItem with notification.enabled=true; config-side flips notificationsEnabled to false; sync propagates the change to the CarePlanItem', async () => {
    // The second wiring gap. The current matched-existing-item branch
    // at syncMedicationItemsWithConfig:190-198 only reactivates
    // inactive items. It does NOT update notification config when the
    // config side changes. This contract forward-guards the new
    // update logic.
    mockState.config = configWithMed({
      id: 'med-6',
      name: 'Warfarin',
      dosage: '5mg',
      timesOfDay: ['evening'],
      active: true,
      notificationsEnabled: false, // The new state
      createdAt: NOW,
      updatedAt: NOW,
    });
    // Pre-existing matched CarePlanItem with stale notification state
    mockState.items = [
      {
        id: 'cp-item-warfarin',
        carePlanId: 'cp-test',
        type: 'medication',
        name: 'Warfarin 5mg',
        priority: 'required',
        active: true,
        schedule: {
          frequency: 'daily',
          times: [{ id: 'w-evening', kind: 'exact', label: 'evening', at: '18:00' }],
        },
        medicationDetails: {
          medicationId: 'med-6',
          dose: '5mg',
        },
        notification: {
          enabled: true, // STALE — config side now says false
          timing: 'at_time',
          followUp: { enabled: true, intervalMinutes: 30, maxAttempts: 3 },
        },
        emoji: '💊',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];

    await ensureDailyInstances('default', TODAY);

    const item = findMedItem();
    expect(item).toBeDefined();
    expect(item.notification.enabled).toBe(false);
  });
});
