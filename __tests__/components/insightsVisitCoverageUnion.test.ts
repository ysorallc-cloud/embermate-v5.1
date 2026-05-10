// ============================================================================
// Phase 11.7.4 — UpcomingVisitInsightsCard coverage card reads from
// the union of events + completed instances.
//
// Bug repro: device check after 11.6 surfaced "0 of 15 days logged ·
// 0 meds · 0 vitals · 0 meals · 0 notes" on the Insights-tab Visit
// Prep coverage card despite seeded data. Root cause: the same bug
// class Phase 5.13.5 fixed for narrativeSummaryBuilder.
// loadDataCoverage at UpcomingVisitInsightsCard.tsx:67-99 reads
// ONLY from getEventsByDateRange (events pipeline). Sample-data
// writes through the instance pipeline (logInstanceCompletion →
// createLogEntry); it never emits the legacy event types
// 'medication_taken' / 'vitals_recorded' / 'meal_logged' /
// 'note_added'. The events read returned an empty array → all four
// pills 0, daysLogged 0.
//
// Fix: extract computeDataCoverage as a pure helper that takes both
// events and completed instances, unioning per-source counts and
// per-date activity. Same dedup pattern as
// narrativeSummaryBuilder.unionCount / Phase 11.5.1 fix:
// (carePlanItemId, scheduledTime) → fall back to event:${id} for
// events without those keys.
//
// Pinned contracts:
//   1. Empty fixtures → all counts 0.
//   2. Events-only fixture (legacy path) still works.
//   3. Instances-only fixture (sample-data path) populates counts.
//   4. Union counts both, dedup'd by (carePlanItemId, scheduledTime).
//   5. daysLogged is distinct dates across both pipelines.
//   6. Notes count comes from events ('note_added') — no instance
//      counterpart since CarePlanItemType doesn't include 'note'.
//   7. Source-level wiring: loadDataCoverage fetches from both
//      pipelines and calls computeDataCoverage.
// ============================================================================

import {
  computeDataCoverage,
  COVERAGE_WINDOW_DAYS,
} from '../../utils/visitCoverage';

function event(type: string, date: string, opts: { itemId?: string; sched?: string; id?: string } = {}): any {
  return {
    id: opts.id ?? `evt-${type}-${date}-${Math.random()}`,
    patientId: 'default',
    type,
    timestamp: `${date}T08:00:00Z`,
    metadata: opts.itemId && opts.sched
      ? { carePlanItemId: opts.itemId, scheduledTime: opts.sched }
      : {},
  };
}

function instance(itemType: string, date: string, status = 'completed', opts: { id?: string; sched?: string } = {}): any {
  return {
    id: opts.id ?? `inst-${itemType}-${date}`,
    carePlanId: 'cp',
    carePlanItemId: opts.id ?? `item-${itemType}-${date}`,
    patientId: 'default',
    date,
    scheduledTime: opts.sched ?? `${date}T08:00:00Z`,
    windowLabel: 'morning',
    windowId: 'morning',
    status,
    itemName: itemType,
    itemType,
    priority: 'recommended',
    createdAt: date,
    updatedAt: date,
  };
}

describe('Phase 11.7.4 — computeDataCoverage', () => {
  it('contract 1: empty events + empty instances → all zero', () => {
    const out = computeDataCoverage([], [], COVERAGE_WINDOW_DAYS);
    expect(out.daysLogged).toBe(0);
    expect(out.meds).toBe(0);
    expect(out.vitals).toBe(0);
    expect(out.meals).toBe(0);
    expect(out.notes).toBe(0);
    expect(out.windowDays).toBe(COVERAGE_WINDOW_DAYS);
  });

  it('contract 2: events-only fixture still counts (regression-pin for legacy callers)', () => {
    const events = [
      event('medication_taken', '2026-05-01'),
      event('medication_taken', '2026-05-02'),
      event('vitals_recorded', '2026-05-01'),
      event('meal_logged', '2026-05-03'),
      event('note_added', '2026-05-04'),
    ];
    const out = computeDataCoverage(events, [], COVERAGE_WINDOW_DAYS);
    expect(out.meds).toBe(2);
    expect(out.vitals).toBe(1);
    expect(out.meals).toBe(1);
    expect(out.notes).toBe(1);
    expect(out.daysLogged).toBe(4);
  });

  it('contract 3: instances-only fixture populates counts (sample-data path)', () => {
    // Sample-data writes through the instance pipeline; pre-fix the
    // coverage card saw 0 of everything. With the union read, these
    // count.
    const instances = [
      instance('medication', '2026-05-01', 'completed', { id: 'med-1' }),
      instance('medication', '2026-05-02', 'completed', { id: 'med-2' }),
      instance('medication', '2026-05-02', 'skipped', { id: 'med-3' }),
      instance('vitals', '2026-05-01', 'completed', { id: 'v-1' }),
      instance('nutrition', '2026-05-03', 'completed', { id: 'n-1' }),
    ];
    const out = computeDataCoverage([], instances, COVERAGE_WINDOW_DAYS);
    // Skipped medication is caregiver-acted, counted same as the
    // existing visitPrepPdf adherence formula treats it.
    expect(out.meds).toBe(3);
    expect(out.vitals).toBe(1);
    expect(out.meals).toBe(1);
    expect(out.notes).toBe(0); // no 'note' instance type exists
    expect(out.daysLogged).toBe(3);
  });

  it('contract 4: union dedups when event + instance share (carePlanItemId, scheduledTime)', () => {
    const sharedItemId = 'med-shared';
    const sharedSched = '2026-05-01T08:00:00Z';
    const events = [
      event('medication_taken', '2026-05-01', { itemId: sharedItemId, sched: sharedSched }),
    ];
    const instances = [
      // Same item + scheduled time as the event above.
      {
        ...instance('medication', '2026-05-01'),
        carePlanItemId: sharedItemId,
        scheduledTime: sharedSched,
      },
    ];
    const out = computeDataCoverage(events, instances, COVERAGE_WINDOW_DAYS);
    // Without dedup the count would be 2; with dedup it's 1.
    expect(out.meds).toBe(1);
  });

  it('contract 5: daysLogged is distinct dates across both pipelines', () => {
    const events = [event('medication_taken', '2026-05-01')];
    const instances = [instance('vitals', '2026-05-02', 'completed')];
    const out = computeDataCoverage(events, instances, COVERAGE_WINDOW_DAYS);
    expect(out.daysLogged).toBe(2);
  });

  it('contract 6: pending / missed instances do NOT count toward coverage', () => {
    // Coverage measures "did the caregiver log anything that day".
    // Pending and missed mean the caregiver did NOT act, so they
    // must not contribute to daysLogged or per-source counts.
    const instances = [
      instance('medication', '2026-05-01', 'pending'),
      instance('medication', '2026-05-02', 'missed'),
    ];
    const out = computeDataCoverage([], instances, COVERAGE_WINDOW_DAYS);
    expect(out.meds).toBe(0);
    expect(out.daysLogged).toBe(0);
  });

  it('contract 7: medication_skipped events count as caregiver-acted', () => {
    // Per visitPrepPdf.ts:282-284, skipped status counts as
    // caregiver-acted in the adherence formula. The coverage card
    // mirrors that semantics for parity.
    const events = [
      event('medication_taken', '2026-05-01'),
      event('medication_skipped', '2026-05-02'),
    ];
    const out = computeDataCoverage(events, [], COVERAGE_WINDOW_DAYS);
    expect(out.meds).toBe(2);
  });
});

// ----------------------------------------------------------------------------
// Source-level wiring audit — loadDataCoverage fetches both pipelines
// ----------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 11.7.4 — loadDataCoverage wiring', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'components/insights/UpcomingVisitInsightsCard.tsx'),
    'utf8',
  );

  it('contract 8: loadDataCoverage calls listDailyInstancesRange (instance pipeline)', () => {
    const fnStart = SRC.indexOf('async function loadDataCoverage');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = SRC.slice(fnStart, fnStart + 3000);
    expect(fnBody).toMatch(/listDailyInstancesRange\s*\(/);
    expect(fnBody).toMatch(/getEventsByDateRange\s*\(/);
  });

  it('contract 9: loadDataCoverage delegates aggregation to computeDataCoverage', () => {
    // The pure helper does the union work; the async wrapper only
    // fetches. Pin the consumption shape so future edits don't
    // accidentally re-inline the events-only path.
    const fnStart = SRC.indexOf('async function loadDataCoverage');
    const fnBody = SRC.slice(fnStart, fnStart + 3000);
    expect(fnBody).toMatch(/computeDataCoverage\s*\(/);
  });
});
