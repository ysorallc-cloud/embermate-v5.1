// ============================================================================
// Phase 11.8.1 — buildTodayRecap value-based recap.
//
// Replaces the count-based ("1 vitals reading recorded. 2 wellness
// checks recorded.") output of buildDayNarrative for the Today path
// with value-based prose ("BP 132/82 · HR 76 · Glucose 135").
// Reuses assembleVisitPrepData's shape — group by itemType, surface
// values when they exist, fall back to count when they don't.
//
// Pinned contracts:
//   1. Medications — "X/Y medications taken" with windowLabel context
//      when consistent ("morning meds taken on time").
//   2. Vitals — value-based BP/HR/Glucose/Weight formatting with
//      the earliest reading's clock time as the section label.
//   3. Wellness — mood/alertness phrasing from LogEntry.data
//      payloads, not counts.
//   4. Meals — eaten/skipped/pending status grouped by mealType.
//   5. Per-section count fallback when values are missing.
//   6. Empty data → hasData: false / no sections / null subtitle.
//   7. No patient-name interpolation (Phase 10 rule carries forward).
//   8. No interpretive language — no "concerning", "good", "stable",
//      same forbidden-vocab spirit as narrativeSummaryBuilder
//      factualOnly mode.
// ============================================================================

import {
  buildTodayRecap,
  TodayRecap,
} from '../../utils/todayRecapBuilder';

// ----------------------------------------------------------------------------
// Storage mocks
// ----------------------------------------------------------------------------

const mockListDailyInstances = jest.fn();
const mockListLogsByDate = jest.fn();
const mockGetVitalsInRange = jest.fn();

jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...args: any[]) => mockListDailyInstances(...args),
  listLogsByDate: (...args: any[]) => mockListLogsByDate(...args),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: (...args: any[]) => mockGetVitalsInRange(...args),
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

// ----------------------------------------------------------------------------
// Fixture helpers
// ----------------------------------------------------------------------------

const TODAY = '2026-05-09';

function inst(overrides: Partial<any> = {}): any {
  return {
    id: `i-${Math.random()}`,
    carePlanId: 'cp',
    carePlanItemId: `item-${Math.random()}`,
    patientId: 'default',
    date: TODAY,
    scheduledTime: `${TODAY}T08:00:00Z`,
    windowLabel: 'morning',
    windowId: 'morning',
    status: 'completed',
    itemName: 'Item',
    itemType: 'medication',
    priority: 'recommended',
    createdAt: TODAY,
    updatedAt: TODAY,
    ...overrides,
  };
}

function log(overrides: Partial<any> = {}): any {
  return {
    id: `log-${Math.random()}`,
    patientId: 'default',
    timestamp: `${TODAY}T08:30:00Z`,
    date: TODAY,
    outcome: 'completed',
    source: 'now',
    immutable: true,
    createdAt: `${TODAY}T08:30:00Z`,
    ...overrides,
  };
}

function vital(type: string, value: number, hour = 8): any {
  // Local-time timestamp (no Z) so the recap's clock label fires
  // against the test's intended hour regardless of TZ. Vitals are
  // stored as ISO; display reads `new Date(timestamp).getHours()`,
  // which is local-time.
  return {
    id: `v-${type}-${value}`,
    type,
    value,
    timestamp: `${TODAY}T${String(hour).padStart(2, '0')}:00:00`,
    unit: type === 'glucose' ? 'mg/dL'
      : type === 'weight' ? 'lbs'
      : type === 'heartRate' ? 'bpm'
      : type === 'systolic' || type === 'diastolic' ? 'mmHg'
      : '',
  };
}

function setMocks(instances: any[] = [], logs: any[] = [], vitals: any[] = []) {
  mockListDailyInstances.mockResolvedValue(instances);
  mockListLogsByDate.mockResolvedValue(logs);
  mockGetVitalsInRange.mockResolvedValue(vitals);
}

beforeEach(() => {
  mockListDailyInstances.mockReset();
  mockListLogsByDate.mockReset();
  mockGetVitalsInRange.mockReset();
});

// ----------------------------------------------------------------------------
// Contracts
// ----------------------------------------------------------------------------

describe('Phase 11.8.1 — buildTodayRecap', () => {
  describe('Contract 6: empty data', () => {
    it('returns hasData=false with no sections when nothing logged', async () => {
      setMocks([], [], []);
      const out = await buildTodayRecap(TODAY);
      expect(out.hasData).toBe(false);
      expect(out.sections).toEqual([]);
    });
  });

  describe('Contract 1: medication value-based output', () => {
    it('all 3 morning meds completed → value-based "morning meds taken on time"', async () => {
      const instances = [
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed', itemName: 'Aspirin' }),
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed', itemName: 'Metformin' }),
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed', itemName: 'Lisinopril' }),
      ];
      setMocks(instances, [], []);
      const out = await buildTodayRecap(TODAY);
      const meds = out.sections.find((s) => s.itemType === 'medication');
      expect(meds).toBeDefined();
      // Per spec: "5/5 morning meds taken on time" — proportion + window + status verb.
      expect(meds!.text).toMatch(/3\/3/);
      expect(meds!.text.toLowerCase()).toMatch(/morning/);
      expect(meds!.text.toLowerCase()).toMatch(/taken/);
    });

    it('partial completion surfaces remaining count', async () => {
      const instances = [
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed' }),
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed' }),
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'pending' }),
        inst({ itemType: 'medication', windowLabel: 'evening', status: 'pending' }),
      ];
      setMocks(instances, [], []);
      const out = await buildTodayRecap(TODAY);
      const meds = out.sections.find((s) => s.itemType === 'medication');
      // 2 of 4 completed — text must reflect both numbers.
      expect(meds!.text).toMatch(/2\/4|2 of 4/);
    });
  });

  describe('Contract 2: vitals value-based output', () => {
    it('readings render as values, not "X readings recorded"', async () => {
      setMocks([], [], [
        vital('systolic', 132, 8),
        vital('diastolic', 82, 8),
        vital('heartRate', 76, 8),
        vital('glucose', 135, 8),
        vital('weight', 194, 8),
      ]);
      const out = await buildTodayRecap(TODAY);
      const vitals = out.sections.find((s) => s.itemType === 'vitals');
      expect(vitals).toBeDefined();
      expect(vitals!.text).toMatch(/132\/82/);
      expect(vitals!.text).toMatch(/76\b/);
      expect(vitals!.text).toMatch(/135/);
      expect(vitals!.text).toMatch(/194/);
      // Counts must not be the headline phrasing.
      expect(vitals!.text).not.toMatch(/\b\d+ vitals (reading|readings) recorded\b/i);
    });

    it('section label includes the earliest reading\'s clock time', async () => {
      // Per spec sketch: "Vitals (8a)" — abbreviated AM/PM.
      setMocks([], [], [vital('systolic', 132, 8), vital('diastolic', 82, 8)]);
      const out = await buildTodayRecap(TODAY);
      const vitals = out.sections.find((s) => s.itemType === 'vitals');
      // Match either "Vitals (8a)" or "Vitals (8 AM)" — the spec
      // sketch left the exact format open. Pin: time appears in the
      // label or in the text.
      const labelOrText = `${vitals!.label} ${vitals!.text}`;
      expect(labelOrText).toMatch(/8\s*[ap]\b|8\s*[AP]M/i);
    });
  });

  describe('Contract 3: wellness value-based output', () => {
    it('mood data surfaces as a label, not a count', async () => {
      const instances = [
        inst({ itemType: 'wellness', windowLabel: 'morning', status: 'completed' }),
      ];
      const logs = [
        log({
          carePlanItemId: instances[0].carePlanItemId,
          dailyInstanceId: instances[0].id,
          data: { type: 'mood', mood: 5, energy: 4 },
        }),
      ];
      setMocks(instances, logs, []);
      const out = await buildTodayRecap(TODAY);
      const wellness = out.sections.find((s) => s.itemType === 'wellness');
      expect(wellness).toBeDefined();
      // Mood 5 → some descriptor like "great mood" / "good" / etc.
      // Pin: there's a non-numeric label after "mood" reference.
      expect(wellness!.text.toLowerCase()).toMatch(/mood|alert|energy|good|great|fine/);
      expect(wellness!.text).not.toMatch(/\b\d+ wellness (check|checks) recorded\b/i);
    });
  });

  describe('Contract 4: meals value-based output', () => {
    it('eaten and pending meals render as status, not count', async () => {
      const instances = [
        inst({ itemType: 'nutrition', windowLabel: 'morning', status: 'completed', itemName: 'Breakfast' }),
        inst({ itemType: 'nutrition', windowLabel: 'afternoon', status: 'pending', itemName: 'Lunch' }),
        inst({ itemType: 'nutrition', windowLabel: 'evening', status: 'pending', itemName: 'Dinner' }),
      ];
      setMocks(instances, [], []);
      const out = await buildTodayRecap(TODAY);
      const meals = out.sections.find((s) => s.itemType === 'nutrition');
      expect(meals).toBeDefined();
      const text = meals!.text.toLowerCase();
      expect(text).toMatch(/breakfast/);
      expect(text).toMatch(/lunch|dinner/);
      // Status verbiage (eaten / pending / skipped) appears.
      expect(text).toMatch(/eaten|pending|skipped/);
    });
  });

  describe('Contract 5: per-section count fallback', () => {
    it('vitals with no values present falls back to count', async () => {
      // Reading with value=0 / undefined isn't sensible for vitals; in
      // practice the reading would just be absent. Simulate the
      // "log written but value missing" case by passing a reading
      // with NaN value.
      setMocks([], [], [
        { ...vital('systolic', NaN, 8), value: NaN as any },
      ]);
      const out = await buildTodayRecap(TODAY);
      const vitals = out.sections.find((s) => s.itemType === 'vitals');
      // With invalid values, the section MAY render a count fallback
      // OR be omitted entirely — both are acceptable.
      // Pin: it does NOT render a fabricated "BP NaN/NaN".
      if (vitals) {
        expect(vitals.text).not.toMatch(/NaN/i);
      }
    });

    it('wellness completed instance with no log payload falls back to count phrasing', async () => {
      const instances = [
        inst({ itemType: 'wellness', windowLabel: 'morning', status: 'completed' }),
      ];
      // No matching log entry → no value data.
      setMocks(instances, [], []);
      const out = await buildTodayRecap(TODAY);
      const wellness = out.sections.find((s) => s.itemType === 'wellness');
      expect(wellness).toBeDefined();
      // Falls back to count-style phrasing — the value-based phrasing
      // ("alert, good mood") only fires when payload data exists.
      expect(wellness!.text).toMatch(/check/i);
    });
  });

  describe('Contract 7: patient-name interpolation', () => {
    it('output never contains "Mom" / "Dad" — patient-agnostic', async () => {
      // The builder reads no PatientContext; this contract pins the
      // file-level constraint by checking that any plausible patient
      // name doesn't show up in the produced text. Sample-data uses
      // "Dad"; tests use "Mom".
      const instances = [
        inst({ itemType: 'medication', status: 'completed' }),
        inst({ itemType: 'wellness', status: 'completed' }),
      ];
      const logs = [log({ data: { type: 'mood', mood: 4 } })];
      setMocks(instances, logs, [vital('systolic', 132, 8), vital('diastolic', 82, 8)]);
      const out = await buildTodayRecap(TODAY);
      const allText = [out.subtitle, ...out.sections.map((s) => `${s.label} ${s.text}`)].join(' ');
      expect(allText).not.toMatch(/\bMom\b/);
      expect(allText).not.toMatch(/\bDad\b/);
    });
  });

  describe('Contract 8: no interpretive vocabulary', () => {
    const FORBIDDEN = /\b(concerning|alarming|stable|abnormal|normal|healthy|unwell|good sign|worrying)\b/i;

    it('value-based output stays observation-only', async () => {
      const instances = [
        inst({ itemType: 'medication', status: 'completed' }),
      ];
      setMocks(instances, [], [vital('systolic', 165, 8), vital('diastolic', 105, 8)]);
      const out = await buildTodayRecap(TODAY);
      const allText = [out.subtitle, ...out.sections.map((s) => `${s.label} ${s.text}`)].join(' ');
      expect(allText).not.toMatch(FORBIDDEN);
    });
  });

  describe('Subtitle is a short value-based recap', () => {
    it('non-empty when sections exist', async () => {
      const instances = [
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed', itemName: 'Aspirin' }),
        inst({ itemType: 'medication', windowLabel: 'morning', status: 'completed', itemName: 'Metformin' }),
      ];
      setMocks(instances, [], []);
      const out = await buildTodayRecap(TODAY);
      expect(out.subtitle.length).toBeGreaterThan(0);
      // Subtitle must NOT be the legacy phrasing.
      expect(out.subtitle).not.toMatch(/\d+ medication (dose|doses) (logged|taken)\b/i);
    });

    it('empty when no sections', async () => {
      setMocks([], [], []);
      const out = await buildTodayRecap(TODAY);
      expect(out.subtitle).toBe('');
    });
  });
});
