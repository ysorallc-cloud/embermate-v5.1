/**
 * insightEngine.ts — trigger / non-trigger fixture tests.
 *
 * For each insight, we drive a fixture that should trigger it and one that
 * should not, then assert both the trigger logic AND the generated copy
 * (severity, percentage math, key context phrases).
 *
 * Storage modules are mocked so each test is hermetic.
 */

jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn(),
  getMedicationLogs: jest.fn(),
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: jest.fn(),
}));
jest.mock('../../utils/dailyTrackingStorage', () => ({
  getDailyTrackingLogs: jest.fn(),
}));
jest.mock('../../utils/caregiverWellnessStorage', () => ({
  getDailyChecks: jest.fn(),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: jest.fn(),
  DEFAULT_PATIENT_ID: 'default',
}));

import {
  analyzeMedicationAdherence,
  analyzeBloodPressureTrends,
  analyzeMoodPatterns,
  analyzeSleepMoodCorrelation,
  analyzeHydration,
  analyzeCaregiverCorrelations,
  getAllInsights,
  dismissInsight,
  clearDismissedInsights,
} from '../../utils/insightEngine';

import { getMedications, getMedicationLogs } from '../../utils/medicationStorage';
import { getVitalsInRange } from '../../utils/vitalsStorage';
import { getDailyTrackingLogs } from '../../utils/dailyTrackingStorage';
import { getDailyChecks } from '../../utils/caregiverWellnessStorage';
import { listDailyInstancesRange } from '../../storage/carePlanRepo';

const mockGetMeds = getMedications as jest.MockedFunction<typeof getMedications>;
const mockGetMedLogs = getMedicationLogs as jest.MockedFunction<typeof getMedicationLogs>;
const mockGetVitals = getVitalsInRange as jest.MockedFunction<typeof getVitalsInRange>;
const mockGetTracking = getDailyTrackingLogs as jest.MockedFunction<typeof getDailyTrackingLogs>;
const mockGetChecks = getDailyChecks as jest.MockedFunction<typeof getDailyChecks>;
const mockListInstances = listDailyInstancesRange as jest.MockedFunction<typeof listDailyInstancesRange>;

beforeEach(async () => {
  // Default: no data of any kind — every insight returns null
  mockGetMeds.mockResolvedValue([]);
  mockGetMedLogs.mockResolvedValue([]);
  mockGetVitals.mockResolvedValue([]);
  mockGetTracking.mockResolvedValue([]);
  mockGetChecks.mockResolvedValue([]);
  mockListInstances.mockResolvedValue([]);
  await clearDismissedInsights();
});

// ────────────────────────────────────────────────────────────────────────────
// Helper builders
// ────────────────────────────────────────────────────────────────────────────

function instance(status: 'completed' | 'skipped' | 'missed' | 'pending', overrides: any = {}): any {
  return {
    id: `inst-${Math.random()}`,
    carePlanId: 'cp1',
    carePlanItemId: 'item1',
    patientId: 'default',
    date: '2026-04-20',
    scheduledTime: '08:00',
    windowLabel: 'morning',
    windowId: 'w1',
    status,
    itemName: 'Med',
    itemType: 'medication',
    priority: 'required',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-20T08:00:00Z',
    ...overrides,
  };
}

function vital(type: string, value: number, daysAgo = 1): any {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id: `v-${value}-${daysAgo}`, type, value, unit: 'mmHg', timestamp: d.toISOString() };
}

function tracking(date: string, fields: { mood?: number; sleep?: number; hydration?: number }): any {
  return {
    date,
    mood: fields.mood ?? null,
    energy: null,
    sleep: fields.sleep ?? null,
    sleepQuality: null,
    meals: null,
    hydration: fields.hydration ?? null,
    symptoms: [],
    notes: null,
    tags: [],
    pain: null,
  };
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ────────────────────────────────────────────────────────────────────────────
// MEDICATION ADHERENCE
// Trigger when adherence < 90%; severity tiers: <60 alert, <80 warning, else info.
// ────────────────────────────────────────────────────────────────────────────

describe('analyzeMedicationAdherence', () => {
  it('returns null when adherence is ≥ 90% (no insight needed)', async () => {
    const instances = [
      instance('completed'), instance('completed'), instance('completed'),
      instance('completed'), instance('completed'), instance('completed'),
      instance('completed'), instance('completed'), instance('completed'),
      instance('completed'), // 10/10 = 100%
    ];
    mockListInstances.mockResolvedValue(instances);
    const result = await analyzeMedicationAdherence(7);
    expect(result).toBeNull();
  });

  it('triggers with severity "info" when adherence is 80–89%', async () => {
    // 8 completed + 2 missed = 80% — boundary case — still <90 so triggers
    const instances = [
      ...Array.from({ length: 8 }, () => instance('completed')),
      ...Array.from({ length: 2 }, () => instance('missed')),
    ];
    mockListInstances.mockResolvedValue(instances);
    const result = await analyzeMedicationAdherence(7);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('info');
    expect(result!.specificData.percentage).toBe(80);
    expect(result!.context).toMatch(/scheduled doses/i);
  });

  it('triggers with severity "warning" when adherence is 60–79%', async () => {
    // 7 completed + 3 missed = 70%
    const instances = [
      ...Array.from({ length: 7 }, () => instance('completed')),
      ...Array.from({ length: 3 }, () => instance('missed')),
    ];
    mockListInstances.mockResolvedValue(instances);
    const result = await analyzeMedicationAdherence(7);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('warning');
    expect(result!.specificData.percentage).toBe(70);
  });

  it('triggers with severity "alert" when adherence is < 60%', async () => {
    // 5 completed + 5 missed = 50%
    const instances = [
      ...Array.from({ length: 5 }, () => instance('completed')),
      ...Array.from({ length: 5 }, () => instance('missed')),
    ];
    mockListInstances.mockResolvedValue(instances);
    const result = await analyzeMedicationAdherence(7);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('alert');
    expect(result!.specificData.percentage).toBe(50);
    expect(result!.title).toMatch(/Adherence/i);
    expect(result!.actions.length).toBeGreaterThan(0);
  });

  it('counts skipped doses as handled (not as missed)', async () => {
    // 5 completed + 4 skipped + 1 missed = 9/10 handled = 90% → no trigger
    const instances = [
      ...Array.from({ length: 5 }, () => instance('completed')),
      ...Array.from({ length: 4 }, () => instance('skipped')),
      ...Array.from({ length: 1 }, () => instance('missed')),
    ];
    mockListInstances.mockResolvedValue(instances);
    const result = await analyzeMedicationAdherence(7);
    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// BLOOD PRESSURE TRENDS
// Triggers when systolic > 130 OR diastolic > 80; severity "alert" when >140.
// Requires ≥3 systolic readings.
// ────────────────────────────────────────────────────────────────────────────

describe('analyzeBloodPressureTrends', () => {
  it('returns null when fewer than 3 systolic readings', async () => {
    mockGetVitals.mockResolvedValue([vital('systolic', 145, 1), vital('systolic', 142, 2)]);
    const result = await analyzeBloodPressureTrends();
    expect(result).toBeNull();
  });

  it('returns null when average BP is at or below 130/80', async () => {
    mockGetVitals.mockResolvedValue([
      vital('systolic', 120, 1), vital('systolic', 122, 2), vital('systolic', 118, 3),
      vital('diastolic', 75, 1), vital('diastolic', 78, 2), vital('diastolic', 76, 3),
    ]);
    const result = await analyzeBloodPressureTrends();
    expect(result).toBeNull();
  });

  it('triggers "warning" when systolic averages between 131–140', async () => {
    mockGetVitals.mockResolvedValue([
      vital('systolic', 134, 1), vital('systolic', 136, 2), vital('systolic', 132, 3),
      vital('diastolic', 82, 1), vital('diastolic', 84, 2), vital('diastolic', 81, 3),
    ]);
    const result = await analyzeBloodPressureTrends();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('warning');
    expect(result!.title).toMatch(/Blood Pressure/i);
    expect(result!.context).toMatch(/mmHg/i);
  });

  it('triggers "alert" when systolic averages above 140', async () => {
    mockGetVitals.mockResolvedValue([
      vital('systolic', 148, 1), vital('systolic', 152, 2), vital('systolic', 145, 3),
    ]);
    const result = await analyzeBloodPressureTrends();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('alert');
    expect(result!.specificData.current).toBeGreaterThan(140);
  });

  it('triggers when diastolic alone is elevated (>80)', async () => {
    mockGetVitals.mockResolvedValue([
      vital('systolic', 125, 1), vital('systolic', 128, 2), vital('systolic', 124, 3),
      vital('diastolic', 88, 1), vital('diastolic', 92, 2), vital('diastolic', 90, 3),
    ]);
    const result = await analyzeBloodPressureTrends();
    expect(result).not.toBeNull();
    expect(result!.context).toContain('/'); // includes diastolic in copy
  });
});

// ────────────────────────────────────────────────────────────────────────────
// MOOD PATTERNS
// Triggers when ≥40% of days show mood < 4 (out of ≥5 logged days).
// Severity "alert" >60%, else "warning".
// ────────────────────────────────────────────────────────────────────────────

describe('analyzeMoodPatterns', () => {
  it('returns null with fewer than 5 mood logs', async () => {
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { mood: 2 }),
      tracking(dateStr(2), { mood: 3 }),
      tracking(dateStr(3), { mood: 2 }),
      tracking(dateStr(4), { mood: 3 }),
    ]);
    const result = await analyzeMoodPatterns();
    expect(result).toBeNull();
  });

  it('returns null when low-mood percentage < 40%', async () => {
    // 1 low day out of 6 = ~17% → no trigger
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { mood: 2 }),
      tracking(dateStr(2), { mood: 7 }),
      tracking(dateStr(3), { mood: 8 }),
      tracking(dateStr(4), { mood: 6 }),
      tracking(dateStr(5), { mood: 7 }),
      tracking(dateStr(6), { mood: 9 }),
    ]);
    const result = await analyzeMoodPatterns();
    expect(result).toBeNull();
  });

  it('triggers "warning" when low-mood is 40–60% of days', async () => {
    // 3 low / 6 days = 50%
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { mood: 2 }),
      tracking(dateStr(2), { mood: 3 }),
      tracking(dateStr(3), { mood: 2 }),
      tracking(dateStr(4), { mood: 7 }),
      tracking(dateStr(5), { mood: 6 }),
      tracking(dateStr(6), { mood: 8 }),
    ]);
    const result = await analyzeMoodPatterns();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('warning');
    expect(result!.specificData.percentage).toBe(50);
    expect(result!.title).toMatch(/Mood Pattern/i);
  });

  it('triggers "alert" when low-mood exceeds 60%', async () => {
    // 5 low / 7 days = ~71%
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { mood: 2 }),
      tracking(dateStr(2), { mood: 3 }),
      tracking(dateStr(3), { mood: 1 }),
      tracking(dateStr(4), { mood: 2 }),
      tracking(dateStr(5), { mood: 3 }),
      tracking(dateStr(6), { mood: 7 }),
      tracking(dateStr(7), { mood: 8 }),
    ]);
    const result = await analyzeMoodPatterns();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('alert');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SLEEP-MOOD CORRELATION
// Triggers when ≥30% of days have BOTH sleep<6 and mood<4. Requires ≥7 days.
// ────────────────────────────────────────────────────────────────────────────

describe('analyzeSleepMoodCorrelation', () => {
  it('returns null with fewer than 7 complete days', async () => {
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { sleep: 5, mood: 3 }),
      tracking(dateStr(2), { sleep: 5, mood: 3 }),
      tracking(dateStr(3), { sleep: 5, mood: 3 }),
    ]);
    const result = await analyzeSleepMoodCorrelation();
    expect(result).toBeNull();
  });

  it('returns null when correlation strength < 30%', async () => {
    // 1 of 8 days has both low sleep + low mood = 12.5%
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { sleep: 5, mood: 3 }),
      tracking(dateStr(2), { sleep: 8, mood: 7 }),
      tracking(dateStr(3), { sleep: 7, mood: 8 }),
      tracking(dateStr(4), { sleep: 8, mood: 6 }),
      tracking(dateStr(5), { sleep: 7, mood: 7 }),
      tracking(dateStr(6), { sleep: 8, mood: 8 }),
      tracking(dateStr(7), { sleep: 7, mood: 7 }),
      tracking(dateStr(8), { sleep: 8, mood: 9 }),
    ]);
    const result = await analyzeSleepMoodCorrelation();
    expect(result).toBeNull();
  });

  it('triggers when ≥30% of days show low sleep + low mood', async () => {
    // 3 of 7 days = ~43%
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { sleep: 5, mood: 3 }),
      tracking(dateStr(2), { sleep: 4, mood: 2 }),
      tracking(dateStr(3), { sleep: 5, mood: 3 }),
      tracking(dateStr(4), { sleep: 8, mood: 7 }),
      tracking(dateStr(5), { sleep: 8, mood: 8 }),
      tracking(dateStr(6), { sleep: 7, mood: 7 }),
      tracking(dateStr(7), { sleep: 8, mood: 8 }),
    ]);
    const result = await analyzeSleepMoodCorrelation();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('info');
    expect(result!.title).toMatch(/Sleep.*Mood/i);
    expect(result!.pattern).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// HYDRATION
// Triggers when avg < 80% of 8-glass target (i.e., < 6.4). Severity warning <50%.
// Requires ≥5 logged days.
// ────────────────────────────────────────────────────────────────────────────

describe('analyzeHydration', () => {
  it('returns null with fewer than 5 logged days', async () => {
    mockGetTracking.mockResolvedValue([
      tracking(dateStr(1), { hydration: 3 }),
      tracking(dateStr(2), { hydration: 4 }),
    ]);
    const result = await analyzeHydration();
    expect(result).toBeNull();
  });

  it('returns null when averaging ≥ 80% of target', async () => {
    // avg = 7 → 87.5% of 8 → no trigger
    mockGetTracking.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => tracking(dateStr(i + 1), { hydration: 7 })),
    );
    const result = await analyzeHydration();
    expect(result).toBeNull();
  });

  it('triggers "info" when averaging between 50–80% of target', async () => {
    // avg = 5 → 62.5%
    mockGetTracking.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => tracking(dateStr(i + 1), { hydration: 5 })),
    );
    const result = await analyzeHydration();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('info');
    expect(result!.specificData.percentage).toBe(63);
  });

  it('triggers "warning" when averaging below 50% of target', async () => {
    // avg = 3 → 37.5%
    mockGetTracking.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => tracking(dateStr(i + 1), { hydration: 3 })),
    );
    const result = await analyzeHydration();
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('warning');
    expect(result!.title).toMatch(/Hydration/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CAREGIVER CORRELATION
// Triggers when low-sleep days log meds ≥30 min later than good-sleep days.
// Requires ≥7 caregiver checks AND ≥2 low-sleep + ≥2 good-sleep med-log days.
// ────────────────────────────────────────────────────────────────────────────

describe('analyzeCaregiverCorrelations', () => {
  it('returns null with fewer than 7 caregiver checks', async () => {
    mockGetChecks.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        date: dateStr(i + 1), sleep: 2, stress: 3, meals: 3,
        timestamp: new Date().toISOString(),
      })),
    );
    const result = await analyzeCaregiverCorrelations();
    expect(result).toBeNull();
  });

  it('returns null when there are no medication logs', async () => {
    mockGetChecks.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        date: dateStr(i + 1), sleep: 2, stress: 3, meals: 3,
        timestamp: new Date().toISOString(),
      })),
    );
    mockGetMedLogs.mockResolvedValue([]);
    const result = await analyzeCaregiverCorrelations();
    expect(result).toBeNull();
  });

  it('triggers when low-sleep days log meds significantly later', async () => {
    // 4 low-sleep days (sleep=2) with med logs at hour 11
    // 4 good-sleep days (sleep=4) with med logs at hour 8
    // → delay diff = (11 - 8) * 60 = 180 min ≥ 30
    const checks = Array.from({ length: 8 }, (_, i) => ({
      date: dateStr(i + 1),
      sleep: i < 4 ? 2 : 4, // first 4 low, last 4 good
      stress: 3,
      meals: 3,
      timestamp: new Date().toISOString(),
    }));
    mockGetChecks.mockResolvedValue(checks);

    const medLogs = checks.map((c, i) => {
      const hour = i < 4 ? 11 : 8;
      const t = new Date(`${c.date}T${String(hour).padStart(2, '0')}:00:00`);
      return { medicationId: 'm1', timestamp: t.toISOString(), taken: true } as any;
    });
    mockGetMedLogs.mockResolvedValue(medLogs);

    const result = await analyzeCaregiverCorrelations();
    expect(result).not.toBeNull();
    expect(result!.title).toMatch(/Sleep.*Care Timing/i);
    expect(result!.pattern).toMatch(/Low caregiver sleep/);
    expect(result!.specificData.current).toBeGreaterThanOrEqual(30);
  });

  it('returns null when delay difference is below 30 minutes', async () => {
    // Same hour for both low and good sleep days → diff = 0 → no trigger
    const checks = Array.from({ length: 8 }, (_, i) => ({
      date: dateStr(i + 1),
      sleep: i < 4 ? 2 : 4,
      stress: 3,
      meals: 3,
      timestamp: new Date().toISOString(),
    }));
    mockGetChecks.mockResolvedValue(checks);

    const medLogs = checks.map((c) => {
      const t = new Date(`${c.date}T08:00:00`);
      return { medicationId: 'm1', timestamp: t.toISOString(), taken: true } as any;
    });
    mockGetMedLogs.mockResolvedValue(medLogs);

    const result = await analyzeCaregiverCorrelations();
    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AGGREGATION & DISMISSAL
// ────────────────────────────────────────────────────────────────────────────

describe('getAllInsights — aggregation', () => {
  it('returns at most 3 insights even when many trigger', async () => {
    // Trigger med adherence (alert), BP (alert), mood (alert), hydration (warning), sleep-mood
    const instances = Array.from({ length: 10 }, () => instance('missed'));
    mockListInstances.mockResolvedValue(instances);
    mockGetVitals.mockResolvedValue([
      vital('systolic', 150, 1), vital('systolic', 152, 2), vital('systolic', 148, 3),
    ]);
    mockGetTracking.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => tracking(dateStr(i + 1), { mood: 2, sleep: 4, hydration: 3 })),
    );

    const insights = await getAllInsights();
    expect(insights.length).toBeLessThanOrEqual(3);
    // Sorted by severity (alert first)
    if (insights.length > 1) {
      const order = { alert: 0, warning: 1, info: 2 };
      expect(order[insights[0].severity]).toBeLessThanOrEqual(order[insights[1].severity]);
    }
  });

  it('filters out recently dismissed insights', async () => {
    const instances = Array.from({ length: 10 }, () => instance('missed'));
    mockListInstances.mockResolvedValue(instances);

    const before = await getAllInsights();
    expect(before.some(i => i.id === 'medication-adherence')).toBe(true);

    await dismissInsight('medication-adherence');

    const after = await getAllInsights();
    expect(after.some(i => i.id === 'medication-adherence')).toBe(false);
  });
});
