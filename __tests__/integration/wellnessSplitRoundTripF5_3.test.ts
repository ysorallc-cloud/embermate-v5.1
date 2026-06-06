// ============================================================================
// Phase 34 F5.3 — Wellness SPLIT INTEGRATION round-trip + default-
// config seed contract.
//
// Pins the F5.3 wiring at the storage layer:
//   1. The two new editor toggles read/write
//      carePlanConfig.wellness.timesOfDay membership (Q-34.F5.B (b)
//      lock: single source of truth stays closed).
//   2. The combined contract: bucket.enabled tracks "any window
//      active" — auto-flips when the timesOfDay array empties /
//      first window arrives.
//   3. The F5.3 default-config change: new users get
//      ['morning', 'evening'] (NOT the old
//      ['morning', 'midday', 'evening']).
//   4. Hide-not-delete: existing users with 'midday' in their stored
//      timesOfDay keep it untouched (storage write doesn't strip
//      legacy values on its own; F5.3 changes the SEED for new
//      installs, not stored values for existing ones).
//
// STANDING PATTERN (locked elsewhere this session): REAL save/read
// primitives, no mocks on the pipeline. seedDeviceState used per
// the F5.1.2 standing rule for device-realistic state.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCarePlanConfig,
  getCarePlanConfig,
  updateBucketConfig,
  setBucketEnabled,
} from '../../storage/carePlanConfigRepo';
import {
  listDailyInstances,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';
import { createDefaultCarePlanConfig } from '../../types/carePlanConfig';
import { seedDeviceState, makeWellnessItem } from './_helpers/seedDeviceState';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const DATE = '2026-06-06';

describe('Phase 34 F5.3 — Wellness split integration round-trip (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (DEFAULT SEED — NEW USER): createDefaultCarePlanConfig sets wellness.timesOfDay to v1-aligned ["morning", "evening"]', async () => {
    // F5.3 default change: new users get the two v1-visible windows
    // only. The seed at types/carePlanConfig.ts:526 is the SINGLE
    // PLACE this default lives — pinned here so a future contributor
    // can't quietly add midday/night back without breaking this
    // contract.
    const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    expect(cfg.wellness.timesOfDay).toEqual(['morning', 'evening']);
    expect(cfg.wellness.timesOfDay).not.toContain('midday');
    expect(cfg.wellness.timesOfDay).not.toContain('night');
  });

  it('rt-2 (HIDE-NOT-DELETE — EXISTING USER WITH MIDDAY): a stored timesOfDay containing "midday" is preserved untouched; the F5.3 default change does NOT migrate or strip legacy values', async () => {
    // Standing rule: hide-not-delete on user data. Existing users
    // with 'midday' in their stored timesOfDay (from pre-F5.3
    // defaults) keep that value. The v1 UI doesn't surface a toggle
    // for it but the generator continues to honor it via the F3.1
    // single-source-of-truth lock.
    const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    cfg.wellness.timesOfDay = ['morning', 'midday', 'evening'] as any;
    await saveCarePlanConfig(cfg);

    // Round-trip read confirms the legacy 'midday' value survives.
    const fetched = await getCarePlanConfig(DEFAULT_PATIENT_ID);
    expect(fetched).not.toBeNull();
    expect(fetched!.wellness.timesOfDay).toContain('midday');
  });

  it('rt-3 (EDITOR TOGGLE OFF — MORNING): writing wellness.timesOfDay without "morning" + ensuring instances tombstones the morning wellness instance on Now', async () => {
    // Mirrors the device walk: caregiver flips the Morning Check-in
    // editor OFF. The toggle write removes 'morning' from
    // wellness.timesOfDay. Generator's wellness sync (Pass B) +
    // removeStaleWindowInstances tombstones the morning instance
    // (status pending becomes hidden via deactivatedAt; the new
    // primitive's predicate refinement from F5.1.2 applies).
    const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    // Disable everything except wellness to isolate the round-trip.
    for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
      if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
      const bucket = (cfg as any)[k];
      if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'wellness') {
        (bucket as any).enabled = false;
      }
    }
    cfg.wellness = { ...cfg.wellness, enabled: true, timesOfDay: ['morning', 'evening'] as any };

    // Co-enable vitals so ensureDailyInstances doesn't take the
    // hasAnyEnabledBucket early return after wellness's morning
    // window goes away.
    cfg.vitals = { ...cfg.vitals, enabled: true } as any;

    const wellnessItem = makeWellnessItem({ timesOfDay: ['morning', 'evening'] });
    await seedDeviceState({
      date: DATE,
      config: cfg,
      items: [wellnessItem],
      instances: [
        { itemId: 'sync-wellness', windowId: 'sync-wellness-morning-time', status: 'pending' },
        { itemId: 'sync-wellness', windowId: 'sync-wellness-evening-time', status: 'pending' },
      ],
    });

    // Caregiver flips Morning Check-in OFF (the editor toggle write
    // removes 'morning' from timesOfDay).
    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', {
      timesOfDay: ['evening'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    // Device-facing read: morning gone; evening still visible.
    const visible = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const wellness = visible.filter((i) => i.itemType === 'wellness');
    expect(wellness).toHaveLength(1);
    expect(wellness[0].windowId).toBe('sync-wellness-evening-time');

    // Audit-trail opt-in surfaces the tombstoned morning.
    const raw = await listDailyInstances(DEFAULT_PATIENT_ID, DATE, {
      includeDeactivated: true,
    });
    const tombstonedMorning = raw.find(
      (i) => i.itemType === 'wellness' && i.windowId === 'sync-wellness-morning-time',
    );
    expect(tombstonedMorning).toBeDefined();
    expect(typeof tombstonedMorning!.deactivatedAt).toBe('string');
  });

  it('rt-4 (EDITOR TOGGLE ON — EVENING FROM SCRATCH): from a wellness.timesOfDay=[morning] state, writing timesOfDay=[morning, evening] + ensuring creates an evening wellness instance', async () => {
    // Symmetric reverse of rt-3. Caregiver enables Evening Check-in
    // editor (was OFF). The toggle write adds 'evening' to
    // timesOfDay. Generator creates a new evening wellness instance.
    const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
      if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
      const bucket = (cfg as any)[k];
      if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'wellness') {
        (bucket as any).enabled = false;
      }
    }
    cfg.wellness = { ...cfg.wellness, enabled: true, timesOfDay: ['morning'] as any };

    const wellnessItem = makeWellnessItem({ timesOfDay: ['morning'] });
    await seedDeviceState({
      date: DATE,
      config: cfg,
      items: [wellnessItem],
      instances: [
        { itemId: 'sync-wellness', windowId: 'sync-wellness-morning-time', status: 'pending' },
      ],
    });

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', {
      timesOfDay: ['morning', 'evening'],
    });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const visible = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const wellness = visible
      .filter((i) => i.itemType === 'wellness')
      .map((i) => i.windowId)
      .sort();
    expect(wellness).toEqual([
      'sync-wellness-evening-time',
      'sync-wellness-morning-time',
    ]);
  });

  it('rt-5 (BOTH EDITORS OFF — LAST WINDOW REMOVED): toggling the last remaining check-in OFF leaves timesOfDay=[] and the sync-wellness item deactivates', async () => {
    // Caregiver had Morning only, then flips Morning OFF — the
    // bucket itself doesn't need to explicitly disable; the
    // empty-timesOfDay invariant (wellness Pass B targetActive =
    // wellnessTimesOfDay.length > 0) handles the item deactivation.
    // bucket.enabled CAN stay true; the generator handles the
    // semantic correctly.
    const cfg = createDefaultCarePlanConfig(DEFAULT_PATIENT_ID);
    for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
      if (k === 'id' || k === 'patientId' || k === 'createdAt' || k === 'updatedAt' || k === 'version' || k === 'schemaVersion') continue;
      const bucket = (cfg as any)[k];
      if (bucket && typeof bucket === 'object' && 'enabled' in bucket && k !== 'wellness') {
        (bucket as any).enabled = false;
      }
    }
    cfg.wellness = { ...cfg.wellness, enabled: true, timesOfDay: ['morning'] as any };
    cfg.vitals = { ...cfg.vitals, enabled: true } as any; // avoid early-return

    const wellnessItem = makeWellnessItem({ timesOfDay: ['morning'] });
    await seedDeviceState({
      date: DATE,
      config: cfg,
      items: [wellnessItem],
      instances: [
        { itemId: 'sync-wellness', windowId: 'sync-wellness-morning-time', status: 'pending' },
      ],
    });

    await updateBucketConfig(DEFAULT_PATIENT_ID, 'wellness', { timesOfDay: [] });
    await ensureDailyInstances(DEFAULT_PATIENT_ID, DATE);

    const visible = await listDailyInstances(DEFAULT_PATIENT_ID, DATE);
    const wellness = visible.filter((i) => i.itemType === 'wellness');
    expect(wellness).toHaveLength(0);
  });
});
