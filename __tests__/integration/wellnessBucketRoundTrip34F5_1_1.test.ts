// ============================================================================
// Phase 34 F5.1.1 — Wellness bucket WINDOW REMOVE/ADD round-trip
// (LATENT BUG H WINDOW-REMOVE DIRECTION, surfaced by F5.1's vitals chip set).
//
// F5.1's walk failed because removing a vitals window via the new chip
// set didn't deactivate the lingering DailyCareInstance on Now. The
// F5.1.1 audit traced the bug to removeStaleInstances being item-level
// (storage/carePlanRepo.ts:325) — instances whose carePlanItemId is
// active are KEPT regardless of windowId. The fix (F5.1.1's
// removeStaleWindowInstances pass) is generator-level and applies to
// EVERY bucket that has a single CarePlanItem with multiple time
// windows.
//
// THIS FILE pins that wellness has the SAME bug. The wellness Pass-B
// reconciliation pattern landed in Phase 34 F3 (4844903e). Wellness's
// sync-wellness item also has schedule.times = [tod1, tod2, ...] and
// the SAME instance-cleanup path. Pre-F5.1.1 the bug was latent
// because nobody walked the "remove an evening check-in mid-day"
// scenario; F5.1.1 closes the window-remove direction of Bug H
// across all multi-window buckets.
//
// STANDING PATTERN (locked by reflectionRoundTrip35S3C /
// vitalsRoundTrip35S3C / logEntryNotesRoundTrip35S3A /
// logEntrySoftDelete35S3D / vitalsBucketRoundTrip34F5_1 headers,
// applies here verbatim): REAL save/read primitives, mocks ONLY at
// the bottom-layer native modules.
//
// STANDING RULE SHARPENED (F5.1.1): integration tests assert on the
// device-facing layer the screen reads (DailyCareInstance for Now),
// NOT intermediate storage templates (CarePlanItem.schedule.times).
// rt-4 in vitalsBucketRoundTrip went GREEN because the original
// assertion stopped at the template. F5.1.1's refinement IS the
// standing-rule sharpening.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCarePlanConfig,
  updateBucketConfig,
} from '../../storage/carePlanConfigRepo';
import {
  listDailyInstances,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-06-05';

/** Seed a baseline care-plan config with only wellness enabled, mirroring
 *  vitalsBucketRoundTrip's isolate-the-bucket helper so the assertions
 *  read clean. */
async function seedWellnessOnly(timesOfDay: ('morning' | 'midday' | 'evening' | 'night')[]) {
  const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
  for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
    if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
    const bucket = (cfg as any)[k];
    if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'wellness') {
      (bucket as any).enabled = false;
    }
  }
  cfg.wellness = {
    ...cfg.wellness,
    enabled: true,
    timesOfDay: timesOfDay as any,
  };
  await saveCarePlanConfig(cfg);
}

describe('Phase 34 F5.1.1 — Wellness bucket WINDOW remove/add INTEGRATION round-trip (latent Bug H window-remove direction; no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (ADD WINDOW): adding a window → schedule.times reconciles AND a new DailyCareInstance for the added window appears on listDailyInstances', async () => {
    // Symmetric with vitalsBucketRoundTrip rt-3. Forward-guard against
    // wellness's Pass-B reconciliation drifting from vitals's Pass A —
    // the same shared resolver (TIME_OF_DAY_TO_WINDOW +
    // TIME_OF_DAY_DEFAULTS) drives both, but the test pins it.
    await seedWellnessOnly(['morning']);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
      const wellnessInst = inst.filter((i) => i.itemType === 'wellness');
      expect(wellnessInst).toHaveLength(1);
    }

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', {
      timesOfDay: ['morning', 'evening'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const wellnessInst = inst.filter((i) => i.itemType === 'wellness');
    expect(wellnessInst).toHaveLength(2);
    const windowIds = wellnessInst.map((i) => i.windowId).sort();
    expect(windowIds).toEqual([
      'sync-wellness-evening-time',
      'sync-wellness-morning-time',
    ]);
  });

  it('rt-2 (REMOVE WINDOW — LATENT BUG H FIX): removing an evening check-in window → the pending evening DailyCareInstance is soft-deactivated and no longer surfaces from listDailyInstances', async () => {
    // THE LATENT BUG H WINDOW-REMOVE PIN. Pre-F5.1.1 wellness has
    // had this bug since 4844903e (Phase 34 F3). The reason it
    // didn't surface earlier: most users don't toggle wellness
    // windows mid-day. F5.1.1's generator-level fix
    // (removeStaleWindowInstances) closes vitals AND wellness AND
    // every future multi-window bucket uniformly.
    //
    // Pre-fix this contract goes RED — the pending evening
    // instance lingers on listDailyInstances even after the chip
    // is removed. Post-fix it goes GREEN — the soft-deactivation
    // pass tombstones the stale-window pending instance.
    await seedWellnessOnly(['morning', 'evening']);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
      const wellnessInst = inst.filter((i) => i.itemType === 'wellness');
      expect(wellnessInst).toHaveLength(2);
    }

    // Caregiver removes the evening chip.
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', {
      timesOfDay: ['morning'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Device-facing read — evening pending instance gone.
    const visible = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const visibleWellness = visible.filter((i) => i.itemType === 'wellness');
    expect(visibleWellness).toHaveLength(1);
    expect(visibleWellness[0].windowId).toBe('sync-wellness-morning-time');
    expect(
      visibleWellness.find((i) => i.windowId === 'sync-wellness-evening-time'),
    ).toBeUndefined();

    // Audit-trail layer — opt-in includeDeactivated surfaces the
    // tombstoned evening instance.
    const raw = await listDailyInstances(DEFAULT_PATIENT_ID, DATE, {
      includeDeactivated: true,
    });
    const eveningRaw = raw.find(
      (i) => i.windowId === 'sync-wellness-evening-time' && i.itemType === 'wellness',
    );
    expect(eveningRaw).toBeDefined();
    expect(typeof eveningRaw!.deactivatedAt).toBe('string');
  });

  it('rt-3 (AUDIT-TRAIL PRESERVATION): a COMPLETED wellness check-in for a removed window survives the schedule change — caregiver action history is not silently dropped', async () => {
    // Mirrors vitalsBucketRoundTrip rt-7. Symmetric across multi-
    // window buckets. The window-staleness pass MUST tombstone only
    // the unactioned placeholders (status === 'pending'); actioned
    // instances stay visible verbatim regardless of whether their
    // window is still in the schedule.
    await seedWellnessOnly(['morning', 'evening']);
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Caregiver completes the evening wellness check-in.
    const before = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const eveningInst = before.find(
      (i) => i.itemType === 'wellness' && i.windowId === 'sync-wellness-evening-time',
    );
    expect(eveningInst).toBeDefined();
    await updateDailyInstanceStatus(
      DEFAULT_PATIENT_ID,
      DATE,
      eveningInst!.id,
      'completed',
    );

    // Later removes the evening chip from the editor.
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', {
      timesOfDay: ['morning'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // The completed evening instance MUST still surface — Journal
    // Section 2, handoff PDF, insights, etc. all read this layer.
    const after = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const completedEvening = after.find(
      (i) => i.itemType === 'wellness' && i.windowId === 'sync-wellness-evening-time',
    );
    expect(completedEvening).toBeDefined();
    expect(completedEvening!.status).toBe('completed');
    expect(completedEvening!.deactivatedAt).toBeUndefined();
  });

  it('rt-4 (BUCKET DISABLE STILL WORKS): toggling wellness off → pending wellness instances are tombstoned (default reads hide them; bucket-Switch path preserved)', async () => {
    // Defensive: F5.1.1's new window-level pass MUST NOT regress the
    // existing bucket-level cleanup. Toggling wellness off should
    // continue to drop pending wellness instances from the device-
    // facing read. F5.1.1 refinement: the existing removeStaleInstances
    // is upgraded from hard-delete to soft-delete (tombstone) so
    // completed/skipped/missed instances would be preserved — but for
    // a freshly-seeded pending-only setup, the device-facing read
    // still shows zero wellness.
    //
    // Setup co-enables vitals so ensureDailyInstances doesn't take
    // the hasAnyEnabledBucket early-return after wellness disable;
    // the wellness sync path runs and deactivates the sync-wellness
    // item; removeStaleInstances tombstones its pending instances.
    await seedWellnessOnly(['morning', 'evening']);
    // Co-enable vitals so the sync path runs after wellness disables.
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'vitals', { enabled: true });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);
    {
      const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
      expect(inst.filter((i) => i.itemType === 'wellness')).toHaveLength(2);
    }

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', { enabled: false });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const inst = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const wellnessInst = inst.filter((i) => i.itemType === 'wellness');
    expect(wellnessInst).toHaveLength(0);
  });
});
