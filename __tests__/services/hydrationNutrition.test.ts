// ============================================================================
// Phase 5.10.a — Hydration & Nutrition aggregator
//
// Pulls hydration cup totals from hydrationRepo + nutrition instances
// from listDailyInstancesRange + meal_logged events for quality detail.
// Returns null when both arms have no data — caller omits the section.
// ============================================================================

const mockGetHydrationHistory = jest.fn();
const mockListDailyInstancesRange = jest.fn();
const mockGetEventsByDateRange = jest.fn();

jest.mock('../../storage/hydrationRepo', () => ({
  getHistory: (...a: any[]) => mockGetHydrationHistory(...a),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...a: any[]) => mockListDailyInstancesRange(...a),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: (...a: any[]) => mockGetEventsByDateRange(...a),
}));

import { buildHydrationNutrition } from '../../services/hydrationNutrition';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Phase 5.10.a — buildHydrationNutrition', () => {
  it('returns null when both hydration and nutrition have no data', async () => {
    mockGetHydrationHistory.mockResolvedValue({});
    mockListDailyInstancesRange.mockResolvedValue([]);
    mockGetEventsByDateRange.mockResolvedValue([]);
    const out = await buildHydrationNutrition({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-05-03' },
    });
    expect(out).toBeNull();
  });

  it('renders hydration only when meals are unconfigured', async () => {
    mockGetHydrationHistory.mockResolvedValue({
      '2026-04-19': 6, '2026-04-20': 5, '2026-04-21': 7,
      '2026-04-22': 8, '2026-04-23': 4, '2026-04-24': 6,
    });
    mockListDailyInstancesRange.mockResolvedValue([]);
    mockGetEventsByDateRange.mockResolvedValue([]);
    const out = await buildHydrationNutrition({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-24' },
    });
    expect(out).not.toBeNull();
    expect(out!.hydration).not.toBeNull();
    expect(out!.hydration!.avgCupsPerDay).toBeCloseTo(6, 0);
    expect(out!.hydration!.target).toBe(8);
    expect(out!.meals).toBeNull();
  });

  it('flags low-hydration days under 50% of target', async () => {
    mockGetHydrationHistory.mockResolvedValue({
      '2026-04-19': 8, '2026-04-20': 3, '2026-04-21': 2,
    });
    mockListDailyInstancesRange.mockResolvedValue([]);
    mockGetEventsByDateRange.mockResolvedValue([]);
    const out = await buildHydrationNutrition({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-21' },
    });
    expect(out!.hydration!.lowDays.length).toBe(2);
    expect(out!.hydration!.lowDays.map((d) => d.date)).toEqual([
      '2026-04-20', '2026-04-21',
    ]);
  });

  it('renders meal full / partial / refused day counts from instance status', async () => {
    mockGetHydrationHistory.mockResolvedValue({});
    mockListDailyInstancesRange.mockResolvedValue([
      { itemType: 'nutrition', status: 'completed', date: '2026-04-19', itemName: 'Breakfast' },
      { itemType: 'nutrition', status: 'completed', date: '2026-04-19', itemName: 'Lunch' },
      { itemType: 'nutrition', status: 'completed', date: '2026-04-19', itemName: 'Dinner' },
      { itemType: 'nutrition', status: 'completed', date: '2026-04-20', itemName: 'Breakfast' },
      { itemType: 'nutrition', status: 'missed',    date: '2026-04-20', itemName: 'Lunch' },
      { itemType: 'nutrition', status: 'completed', date: '2026-04-20', itemName: 'Dinner' },
    ]);
    mockGetEventsByDateRange.mockResolvedValue([]);
    const out = await buildHydrationNutrition({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-20' },
    });
    expect(out!.meals).not.toBeNull();
    expect(out!.meals!.fullMealDays).toBe(1);    // 2026-04-19 — all 3 logged
    expect(out!.meals!.partialMealDays).toBe(1); // 2026-04-20 — 2 of 3 logged
  });

  it('captures refused meals from status===skipped with refused reason', async () => {
    mockGetHydrationHistory.mockResolvedValue({});
    mockListDailyInstancesRange.mockResolvedValue([
      { itemType: 'nutrition', status: 'skipped', date: '2026-04-22',
        itemName: 'Dinner', skipReason: 'refused' },
    ]);
    mockGetEventsByDateRange.mockResolvedValue([]);
    const out = await buildHydrationNutrition({
      patientId: 'p1',
      dateRange: { start: '2026-04-22', end: '2026-04-22' },
    });
    expect(out!.meals!.refusedMeals.length).toBe(1);
    expect(out!.meals!.refusedMeals[0].date).toBe('2026-04-22');
    expect(out!.meals!.refusedMeals[0].meal).toMatch(/Dinner/);
  });

  it("derives appetite summary from meal_logged event quality field", async () => {
    mockGetHydrationHistory.mockResolvedValue({});
    mockListDailyInstancesRange.mockResolvedValue([
      { itemType: 'nutrition', status: 'completed', date: '2026-04-19', itemName: 'Breakfast' },
    ]);
    mockGetEventsByDateRange.mockResolvedValue([
      { type: 'meal_logged', timestamp: '2026-04-19T08:00:00Z',
        metadata: { mealType: 'breakfast', quality: 'good' } },
      { type: 'meal_logged', timestamp: '2026-04-20T08:00:00Z',
        metadata: { mealType: 'breakfast', quality: 'good' } },
      { type: 'meal_logged', timestamp: '2026-04-21T08:00:00Z',
        metadata: { mealType: 'breakfast', quality: 'most' } },
    ]);
    const out = await buildHydrationNutrition({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-21' },
    });
    expect(out!.appetiteSummary).toMatch(/3 of 3|consistent|good/i);
  });
});
