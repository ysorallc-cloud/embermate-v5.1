// ============================================================================
// Phase 34 F5.1.2 — seedDeviceState: device-realistic STATE seeding helper.
//
// STANDING RULE (saved at
//   /Users/ambercook/.claude/projects/.../memory/feedback_test_seed_device_realistic_state.md):
//
//   Integration tests must seed device-realistic STATE, not just
//   device-readable state. The device exists in a particular state by
//   the time the caregiver touches it — including system-mutated state
//   like pending→missed grace transitions, prior tombstones, and auto-
//   deactivated items. Use this helper as the default seed; reach for
//   fresh-state setup (config save + ensureDailyInstances) only when
//   the test specifically proves first-write behavior.
//
//   Every storage→read round-trip test should ideally exercise both
//   fresh AND post-mutation states; THIS HELPER makes the second case
//   cheap.
//
// THIS IS THE THIRD SHARPENING of the test-shape lesson family:
//   1. source-pin → behavior-pin (Slice 3-C)
//   2. behavior-pin → device-facing-layer assertion (F5.1.1)
//   3. device-facing-layer → device-realistic STATE seeding (F5.1.2)
//
// Each sharpening closed one trap class while leaving the next visible.
// The trap closed here: tests that seeded fresh-pending state and
// passed at the device-facing layer still missed bugs that only
// surface against the device's actual post-mutation state (system-
// marked missed, prior tombstones, partial completions, etc.).
//
// NOT A GENERATOR WRAPPER — this helper writes raw storage directly.
// It does NOT call ensureDailyInstances. Use it to seed the storage
// shape the device would actually hold at the moment the caregiver
// taps. Then exercise the production write path (updateBucketConfig,
// updateDailyInstanceStatus, etc.) and run ensureDailyInstances to
// observe the system's response.
//
// COMPANION MEMORIES:
//   feedback_integration_round_trip_pattern.md (no mocks on pipeline)
//   feedback_roundtrip_assert_device_facing_layer.md (Now reads
//     listDailyInstances; Journal reads listLogsByDate; Share reads
//     buildCareBrief)
// ============================================================================

import {
  saveCarePlanConfig,
} from '../../../storage/carePlanConfigRepo';
import {
  upsertCarePlanItem,
  upsertDailyInstances,
  createCarePlan,
  getActiveCarePlan,
  DEFAULT_PATIENT_ID,
} from '../../../storage/carePlanRepo';
import {
  createDefaultCarePlanConfig,
  type CarePlanConfig,
} from '../../../types/carePlanConfig';
import type {
  CarePlanItem,
  DailyCareInstance,
  DailyInstanceStatus,
  LogOutcome,
} from '../../../types/carePlan';

/** Spec for a single device-state instance. The helper derives a fully-
 *  formed DailyCareInstance from this partial spec by reading the
 *  matching CarePlanItem's schedule.times to fill in scheduledTime,
 *  windowLabel, etc. */
export interface SeedInstanceSpec {
  /** carePlanItemId (e.g., 'sync-vitals', 'sync-wellness',
   *  'sync-meal-morning'). MUST correspond to a CarePlanItem in
   *  `items` so the helper can derive the schedule window. */
  itemId: string;
  /** windowId. MUST correspond to a TimeWindow.id in the matching
   *  item's schedule.times — the helper looks it up to derive
   *  scheduledTime + windowLabel. */
  windowId: string;
  /** Required status. Caregiver-acted ('completed' | 'skipped' |
   *  'partial') instances are preserved across schedule changes
   *  per F5.1.2's audit-trail contract; system-marked ('missed')
   *  and unacted ('pending') instances tombstone on cleanup. */
  status: DailyInstanceStatus;
  /** Set this to mark the instance as already tombstoned (e.g., to
   *  seed prior-day or prior-edit state). */
  deactivatedAt?: string;
  /** Optional logId for completed/skipped status (links to a
   *  LogEntry, if one exists in the test's storage). */
  logId?: string;
}

export interface SeedDeviceStateOptions {
  patientId?: string;
  date: string;
  /** Full or partial CarePlanConfig. When omitted, a default config
   *  with no buckets enabled is used. Use this to seed the bucket
   *  enabled/timesOfDay state the device would hold at the moment
   *  the test exercises a write. */
  config?: CarePlanConfig;
  /** CarePlanItems to write. Each item's schedule.times entries are
   *  used to derive instance fields. The helper writes via
   *  upsertCarePlanItem so existing items are merged. */
  items?: CarePlanItem[];
  /** Instance specs to materialize into raw storage. The helper
   *  derives scheduledTime + windowLabel from each spec's matching
   *  item.schedule.times entry. */
  instances?: SeedInstanceSpec[];
}

/**
 * Seed the device's actual storage state at the moment a test begins.
 * Writes carePlanConfig + carePlanItems + dailyInstances directly via
 * the bottom-layer primitives (no generator). After this call, the
 * caregiver-side production write path can be exercised normally
 * (updateBucketConfig, updateDailyInstanceStatus, ensureDailyInstances).
 */
export async function seedDeviceState(
  options: SeedDeviceStateOptions,
): Promise<void> {
  const patientId = options.patientId ?? DEFAULT_PATIENT_ID;

  // 1. Write the config (caller already passed a full CarePlanConfig
  // or omits to leave the default).
  if (options.config) {
    await saveCarePlanConfig(options.config);
  } else {
    await saveCarePlanConfig(createDefaultCarePlanConfig(patientId));
  }

  // 2. Resolve / create the CarePlan so items + instances anchor
  // against a real id.
  let carePlan = await getActiveCarePlan(patientId);
  if (!carePlan) {
    carePlan = await createCarePlan(patientId);
  }

  // 3. Write items.
  for (const item of options.items ?? []) {
    await upsertCarePlanItem({ ...item, carePlanId: carePlan.id });
  }

  // 4. Materialize instances from specs. The matching item's
  // schedule.times entry provides scheduledTime + windowLabel.
  if (options.instances && options.instances.length > 0) {
    const itemsById = new Map<string, CarePlanItem>(
      (options.items ?? []).map((it) => [it.id, it]),
    );
    const now = new Date().toISOString();
    const instances: DailyCareInstance[] = options.instances.map((spec) => {
      const item = itemsById.get(spec.itemId);
      const window = item?.schedule?.times?.find((t) => t.id === spec.windowId);
      const scheduledTime = window
        ? `${options.date}T${window.at}:00`
        : `${options.date}T08:00:00`;
      const windowLabel = (window?.label ?? 'morning') as DailyCareInstance['windowLabel'];
      const instance: DailyCareInstance = {
        id: `inst-${options.date}-${spec.itemId}-${spec.windowId}`,
        carePlanId: carePlan.id,
        carePlanItemId: spec.itemId,
        patientId,
        date: options.date,
        scheduledTime,
        windowLabel,
        windowId: spec.windowId,
        status: spec.status,
        itemName: item?.name ?? 'Item',
        itemType: item?.type ?? 'custom',
        itemEmoji: item?.emoji,
        priority: item?.priority ?? 'recommended',
        createdAt: now,
        updatedAt: now,
      };
      if (spec.deactivatedAt) instance.deactivatedAt = spec.deactivatedAt;
      if (spec.logId) instance.logId = spec.logId;
      return instance;
    });
    await upsertDailyInstances(patientId, options.date, instances);
  }
}

/** Convenience: build a CarePlanItem with vitals defaults + the
 *  caller-supplied schedule. Use to keep test setup terse. */
export function makeVitalsItem(opts: {
  timesOfDay: ('morning' | 'midday' | 'evening' | 'night')[];
}): CarePlanItem {
  const now = new Date().toISOString();
  const timeOfDayMap: Record<string, { label: string; at: string }> = {
    morning: { label: 'morning', at: '08:00' },
    midday: { label: 'afternoon', at: '12:00' },
    evening: { label: 'evening', at: '18:00' },
    night: { label: 'night', at: '21:00' },
  };
  return {
    id: 'sync-vitals',
    carePlanId: 'placeholder',
    type: 'vitals',
    name: 'Check vitals',
    priority: 'recommended',
    active: true,
    schedule: {
      frequency: 'daily',
      times: opts.timesOfDay.map((tod) => ({
        id: `sync-vitals-${tod}-time`,
        kind: 'exact' as const,
        label: timeOfDayMap[tod].label as any,
        at: timeOfDayMap[tod].at,
      })),
    },
    emoji: '📊',
    createdAt: now,
    updatedAt: now,
  };
}

/** Convenience: build a CarePlanItem with wellness defaults. */
export function makeWellnessItem(opts: {
  timesOfDay: ('morning' | 'midday' | 'evening' | 'night')[];
}): CarePlanItem {
  const now = new Date().toISOString();
  const timeOfDayMap: Record<string, { label: string; at: string }> = {
    morning: { label: 'morning', at: '08:00' },
    midday: { label: 'afternoon', at: '12:00' },
    evening: { label: 'evening', at: '18:00' },
    night: { label: 'night', at: '21:00' },
  };
  return {
    id: 'sync-wellness',
    carePlanId: 'placeholder',
    type: 'wellness',
    name: 'Wellness check',
    priority: 'recommended',
    active: true,
    schedule: {
      frequency: 'daily',
      times: opts.timesOfDay.map((tod) => ({
        id: `sync-wellness-${tod}-time`,
        kind: 'exact' as const,
        label: timeOfDayMap[tod].label as any,
        at: timeOfDayMap[tod].at,
      })),
    },
    emoji: '🌅',
    createdAt: now,
    updatedAt: now,
  };
}
