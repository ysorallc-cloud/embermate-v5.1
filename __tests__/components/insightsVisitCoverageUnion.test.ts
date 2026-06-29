// ============================================================================
// visitCoverage.computeDataCoverage — post-Fix-#3 contract.
//
// Wave-1 clinician convergence (Fix #3) retired the events+instances UNION
// counting for vitals + meals on the visit-prep chip. Those two counts now come
// from the canonical readers (countCanonicalVitalsInRange / countCanonical
// MealsLoggedInRange) and are PASSED IN via the `canonical` arg — so the chip
// can't diverge from the Insights tile or the VP report. MEDS, NOTES, and
// daysLogged still come from the union (a med logged via either pipeline, and a
// logged meal/vital still makes the day count toward daysLogged).
//
// (Original Phase 11.7.4 union-read fix for meds/notes/days is preserved; only
// the vitals/meals SOURCE changed.)
//
// Contracts:
//   1. empty + zero canonical → all zero.
//   2. vitals/meals ECHO the canonical arg — NOT the events/instances union.
//   3. meds/notes still union-counted across both pipelines.
//   4. union dedups meds by (carePlanItemId, scheduledTime).
//   5. daysLogged = distinct dates across both pipelines (incl. vitals/meal days).
//   6. pending / missed instances do NOT count.
//   7. medication_skipped counts as caregiver-acted.
//   8. visitCoverage.loadDataCoverage wires the canonical readers + delegates
//      to computeDataCoverage; the card calls it.
// ============================================================================

import {
  computeDataCoverage,
  COVERAGE_WINDOW_DAYS,
} from '../../utils/visitCoverage';

const ZERO = { vitals: 0, meals: 0 };

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

describe('Fix #3 — computeDataCoverage (canonical vitals/meals, union meds/notes/days)', () => {
  it('contract 1: empty + zero canonical → all zero', () => {
    const out = computeDataCoverage([], [], COVERAGE_WINDOW_DAYS, ZERO);
    expect(out.daysLogged).toBe(0);
    expect(out.meds).toBe(0);
    expect(out.vitals).toBe(0);
    expect(out.meals).toBe(0);
    expect(out.notes).toBe(0);
    expect(out.windowDays).toBe(COVERAGE_WINDOW_DAYS);
  });

  it('contract 2: vitals/meals ECHO the canonical arg, NOT the events/instances union', () => {
    // Events + instances carry vitals_recorded / meal_logged / nutrition —
    // none of which must count toward vitals/meals anymore. The canonical
    // arg is the only source.
    const events = [
      event('vitals_recorded', '2026-05-01'),
      event('meal_logged', '2026-05-03'),
    ];
    const instances = [
      instance('vitals', '2026-05-01', 'completed', { id: 'v-1' }),
      instance('nutrition', '2026-05-03', 'completed', { id: 'n-1' }),
    ];
    const out = computeDataCoverage(events, instances, COVERAGE_WINDOW_DAYS, { vitals: 9, meals: 4 });
    expect(out.vitals).toBe(9); // from canonical, not the 2 union rows
    expect(out.meals).toBe(4);  // from canonical, not the 2 union rows
  });

  it('contract 3: meds + notes still union-counted across both pipelines', () => {
    const events = [
      event('medication_taken', '2026-05-01'),
      event('note_added', '2026-05-04'),
    ];
    const instances = [
      instance('medication', '2026-05-02', 'completed', { id: 'med-2' }),
      instance('medication', '2026-05-02', 'skipped', { id: 'med-3' }),
    ];
    const out = computeDataCoverage(events, instances, COVERAGE_WINDOW_DAYS, ZERO);
    expect(out.meds).toBe(3);  // 1 event + 2 instances (skipped = acted)
    expect(out.notes).toBe(1);
  });

  it('contract 4: union dedups meds by (carePlanItemId, scheduledTime)', () => {
    const sharedItemId = 'med-shared';
    const sharedSched = '2026-05-01T08:00:00Z';
    const events = [event('medication_taken', '2026-05-01', { itemId: sharedItemId, sched: sharedSched })];
    const instances = [{ ...instance('medication', '2026-05-01'), carePlanItemId: sharedItemId, scheduledTime: sharedSched }];
    const out = computeDataCoverage(events, instances, COVERAGE_WINDOW_DAYS, ZERO);
    expect(out.meds).toBe(1);
  });

  it('contract 5: daysLogged = distinct dates across both pipelines (incl. vitals/meal days)', () => {
    const events = [event('medication_taken', '2026-05-01'), event('meal_logged', '2026-05-03')];
    const instances = [instance('vitals', '2026-05-02', 'completed')];
    const out = computeDataCoverage(events, instances, COVERAGE_WINDOW_DAYS, ZERO);
    expect(out.daysLogged).toBe(3); // 05-01, 05-02, 05-03
  });

  it('contract 6: pending / missed instances do NOT count', () => {
    const instances = [
      instance('medication', '2026-05-01', 'pending'),
      instance('medication', '2026-05-02', 'missed'),
    ];
    const out = computeDataCoverage([], instances, COVERAGE_WINDOW_DAYS, ZERO);
    expect(out.meds).toBe(0);
    expect(out.daysLogged).toBe(0);
  });

  it('contract 7: medication_skipped events count as caregiver-acted', () => {
    const events = [event('medication_taken', '2026-05-01'), event('medication_skipped', '2026-05-02')];
    const out = computeDataCoverage(events, [], COVERAGE_WINDOW_DAYS, ZERO);
    expect(out.meds).toBe(2);
  });
});

// ----------------------------------------------------------------------------
// Source-level wiring — the canonical wiring lives in visitCoverage now.
// ----------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Fix #3 — loadDataCoverage canonical wiring', () => {
  const COV_SRC = readFileSync(join(__dirname, '../..', 'utils/visitCoverage.ts'), 'utf8');
  const CARD_SRC = readFileSync(join(__dirname, '../..', 'components/insights/UpcomingVisitInsightsCard.tsx'), 'utf8');

  it('contract 8: visitCoverage.loadDataCoverage fetches both pipelines AND the canonical readers', () => {
    const fnStart = COV_SRC.indexOf('export async function loadDataCoverage');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = COV_SRC.slice(fnStart, fnStart + 1200);
    expect(fnBody).toMatch(/getEventsByDateRange\s*\(/);
    expect(fnBody).toMatch(/listDailyInstancesRange\s*\(/);
    expect(fnBody).toMatch(/countCanonicalVitalsInRange\s*\(/);
    expect(fnBody).toMatch(/countCanonicalMealsLoggedInRange\s*\(/);
    expect(fnBody).toMatch(/computeDataCoverage\s*\(/);
  });

  it('contract 9: the card delegates to visitCoverage.loadDataCoverage (no re-inlined union path)', () => {
    expect(CARD_SRC).toMatch(/loadCanonicalCoverage\s*\(/);
    // The old in-component union fetch must be gone.
    expect(CARD_SRC).not.toMatch(/computeDataCoverage\s*\(/);
  });
});
