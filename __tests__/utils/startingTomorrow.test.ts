// ============================================================================
// getStartingTomorrow — the "born-past" preview for MEDS + VITALS.
//
// A med/vitals item added AFTER its time today gets NO instance today (the
// born-overdue guard in carePlanGenerator skips the passed slot so it never
// reads overdue or missed). Without a signal it would VANISH from today's Now.
// This helper derives the calm "first dose/reading tomorrow" line for exactly
// those items. Wellness/meals are NOT skipped by the guard, so they never appear
// here (render-anyway).
// ============================================================================

import { getStartingTomorrow } from '../../utils/startingTomorrow';
import type { MedicationPlanItem, CarePlanConfig } from '../../types/carePlanConfig';
import type { DailyCareInstance } from '../../types/carePlan';

const NOW = new Date('2026-07-16T14:00:00'); // 2:00 PM local
const TODAY = '2026-07-16';
const YESTERDAY = '2026-07-15';

function med(over: Partial<MedicationPlanItem>): MedicationPlanItem {
  return {
    id: 'm1',
    name: 'Lisinopril (Zestril)',
    dosage: '10mg',
    timesOfDay: ['morning'],
    active: true,
    createdAt: `${TODAY}T14:00:00`,
    updatedAt: `${TODAY}T14:00:00`,
    scheduleFrequency: 'daily',
    ...over,
  };
}

function medInstance(over: Partial<DailyCareInstance>): DailyCareInstance {
  return {
    id: 'i1', carePlanItemId: 'c1', itemName: 'Lisinopril (Zestril) 10mg',
    itemType: 'medication', windowLabel: 'morning', scheduledTime: `${TODAY}T08:00:00`,
    date: TODAY, status: 'pending', ...over,
  } as DailyCareInstance;
}
function vitalsInstance(over: Partial<DailyCareInstance> = {}): DailyCareInstance {
  return {
    id: 'v1', carePlanItemId: 'sync-vitals', itemName: 'Check vitals',
    itemType: 'vitals', windowLabel: 'morning', scheduledTime: `${TODAY}T08:00:00`,
    date: TODAY, status: 'pending', ...over,
  } as DailyCareInstance;
}

/** Config with meds + vitals set as given. */
function config(over: { meds?: any; vitals?: any } = {}): CarePlanConfig {
  return {
    meds: { enabled: true, medications: over.meds ?? [] },
    vitals: over.vitals ?? { enabled: false },
  } as unknown as CarePlanConfig;
}

describe('getStartingTomorrow — meds', () => {
  it('lists a DAILY med added today with NO instance today (born-past → "first dose tomorrow")', () => {
    const result = getStartingTomorrow(config({ meds: [med({})] }), [], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'm1', name: 'Lisinopril (Zestril)', noun: 'dose', emoji: '💊', timeLabel: '8:00 AM' });
  });

  it('does NOT list a med that already has a today instance', () => {
    const result = getStartingTomorrow(config({ meds: [med({})] }), [medInstance({})], NOW);
    expect(result).toHaveLength(0);
  });

  it('does NOT list a med created on a prior day / inactive / non-daily', () => {
    expect(getStartingTomorrow(config({ meds: [med({ createdAt: `${YESTERDAY}T14:00:00` })] }), [], NOW)).toHaveLength(0);
    expect(getStartingTomorrow(config({ meds: [med({ active: false })] }), [], NOW)).toHaveLength(0);
    expect(getStartingTomorrow(config({ meds: [med({ scheduleFrequency: 'weekly' })] }), [], NOW)).toHaveLength(0);
  });
});

describe('getStartingTomorrow — vitals', () => {
  const enabledVitals = { enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'] };

  it('lists vitals when enabled with NO vitals instance today (born-past → "first reading tomorrow")', () => {
    const result = getStartingTomorrow(config({ vitals: enabledVitals }), [], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'vitals', name: 'Vitals check', noun: 'reading', emoji: '📊', timeLabel: '8:00 AM' });
  });

  it('does NOT list vitals once a vitals instance exists today (normal day)', () => {
    const result = getStartingTomorrow(config({ vitals: enabledVitals }), [vitalsInstance()], NOW);
    expect(result).toHaveLength(0);
  });

  it('does NOT list vitals when the bucket is disabled or has no vital types', () => {
    expect(getStartingTomorrow(config({ vitals: { enabled: false, vitalTypes: ['bp'], timesOfDay: ['morning'] } }), [], NOW)).toHaveLength(0);
    expect(getStartingTomorrow(config({ vitals: { enabled: true, vitalTypes: [], timesOfDay: ['morning'] } }), [], NOW)).toHaveLength(0);
  });
});

describe('getStartingTomorrow — combined + empties', () => {
  it('returns meds THEN vitals together when both are born-past', () => {
    const result = getStartingTomorrow(
      config({ meds: [med({})], vitals: { enabled: true, vitalTypes: ['bp'], timesOfDay: ['morning'] } }),
      [],
      NOW,
    );
    expect(result.map((i) => i.noun)).toEqual(['dose', 'reading']);
  });

  it('empty config → empty list', () => {
    expect(getStartingTomorrow(config(), [], NOW)).toEqual([]);
    expect(getStartingTomorrow(null, [], NOW)).toEqual([]);
  });
});
