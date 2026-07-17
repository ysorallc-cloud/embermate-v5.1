// ============================================================================
// narrativeSummaryBuilder — per-person BP notability (STEP 1, file 4).
//
// Pins the NEW behavior after migrating isNotable() off the fixed cutoff
// (s < 90 || s >= 140 || d < 60 || d >= 90) onto the canonical observeVital():
// a vitals_recorded event is a notable moment ('concern' tone) when the
// reading sits ABOVE or BELOW this person's own baseline, and NOT when it's
// within their usual — regardless of the textbook number. Uses a real mocked
// baseline so the deviation path is actually exercised (the pre-existing
// factual-mode test only hits the empty-baseline / insufficient_history path).
// ============================================================================

let baselineReadings: any[] = [];
let dayEvent: any = null;

jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: async () => (dayEvent ? [dayEvent] : []),
}));
jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: async () => [],
}));
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: async () => null,
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: async () => baselineReadings,
}));
jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

import { buildDayNarrative } from '../../utils/narrativeSummaryBuilder';

const DAY = '2026-05-06';

function vitalsEvent(systolic: number, diastolic: number) {
  return {
    id: 'evt-vitals',
    type: 'vitals_recorded',
    timestamp: `${DAY}T09:14:00Z`,
    patientId: 'default',
    metadata: { systolic, diastolic },
  };
}

// A person whose usual BP sits ~120/78.
function usualBaseline() {
  const vals = [
    ['systolic', 118], ['systolic', 121], ['systolic', 120], ['systolic', 119], ['systolic', 122],
    ['diastolic', 77], ['diastolic', 79], ['diastolic', 78], ['diastolic', 76], ['diastolic', 80],
  ];
  return vals.map(([type, value], i) => ({
    type,
    value,
    timestamp: `2026-04-${String(10 + i).padStart(2, '0')}T09:00:00Z`,
  }));
}

const vitalsMoment = (out: any) =>
  out.notableMoments.find((m: any) => m.icon === '🩺');

beforeEach(() => {
  baselineReadings = usualBaseline();
  dayEvent = null;
});

describe('narrativeSummaryBuilder — per-person BP notability', () => {
  it('flags a reading ABOVE their usual as a notable moment (concern tone)', async () => {
    dayEvent = vitalsEvent(155, 96); // well above their ~120/78 usual
    const out = await buildDayNarrative(DAY);
    const moment = vitalsMoment(out);
    expect(moment).toBeTruthy();
    expect(moment.tone).toBe('concern');
  });

  it('flags a reading BELOW their usual too (bilateral intent preserved)', async () => {
    dayEvent = vitalsEvent(95, 58); // well below their usual
    const out = await buildDayNarrative(DAY);
    const moment = vitalsMoment(out);
    expect(moment).toBeTruthy();
    expect(moment.tone).toBe('concern');
  });

  it('does NOT flag a reading within their usual', async () => {
    dayEvent = vitalsEvent(121, 79); // right at their usual
    const out = await buildDayNarrative(DAY);
    expect(vitalsMoment(out)).toBeUndefined();
  });

  it('per-person: a textbook-"high" 145 is NOT flagged for someone who usually runs high', async () => {
    baselineReadings = [
      ['systolic', 143], ['systolic', 146], ['systolic', 144], ['systolic', 147], ['systolic', 145],
    ].map(([type, value], i) => ({ type, value, timestamp: `2026-04-${String(10 + i).padStart(2, '0')}T09:00:00Z` }));
    dayEvent = vitalsEvent(145, 88);
    const out = await buildDayNarrative(DAY);
    expect(vitalsMoment(out)).toBeUndefined();
  });

  it('does NOT flag when there is too little baseline to compare', async () => {
    baselineReadings = [
      { type: 'systolic', value: 120, timestamp: '2026-04-10T09:00:00Z' },
      { type: 'systolic', value: 121, timestamp: '2026-04-11T09:00:00Z' },
    ]; // only 2 (< min history of 3)
    dayEvent = vitalsEvent(155, 96);
    const out = await buildDayNarrative(DAY);
    expect(vitalsMoment(out)).toBeUndefined();
  });
});
