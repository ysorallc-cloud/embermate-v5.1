// ============================================================================
// getYesterdayVitals — thin helper that finds yesterday's most recent vital
// reading of a given type. Powers the Now timeline's vitals checkbox: tap
// the checkbox, see yesterday's value pre-filled as a sane default, confirm.
// ============================================================================

const mockGetVitalsByType = jest.fn();

jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsByType: (...args: any[]) => mockGetVitalsByType(...args),
}));

import { getYesterdayVitals } from '../../utils/getYesterdayVitals';

beforeEach(() => {
  mockGetVitalsByType.mockReset();
});

const RealDate = Date;
function freezeNow(iso: string) {
  class FakeDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) super(iso);
      // @ts-expect-error pass-through
      else super(...args);
    }
    static now() {
      return new RealDate(iso).getTime();
    }
  }
  (global as any).Date = FakeDate;
}
afterEach(() => {
  (global as any).Date = RealDate;
});

describe('getYesterdayVitals', () => {
  it('returns the most recent reading of the given type from yesterday', async () => {
    freezeNow('2026-04-30T08:00:00');
    mockGetVitalsByType.mockResolvedValue([
      { id: '1', type: 'bp_systolic', value: 122, unit: 'mmHg', timestamp: '2026-04-29T07:00:00' },
      { id: '2', type: 'bp_systolic', value: 128, unit: 'mmHg', timestamp: '2026-04-29T19:30:00' },
      { id: '3', type: 'bp_systolic', value: 130, unit: 'mmHg', timestamp: '2026-04-30T07:00:00' }, // today, not yesterday
    ]);
    const result = await getYesterdayVitals('bp_systolic' as any);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(128);
    expect(result!.timestamp).toBe('2026-04-29T19:30:00');
  });

  it('returns null when no readings exist for yesterday', async () => {
    freezeNow('2026-04-30T08:00:00');
    mockGetVitalsByType.mockResolvedValue([
      { id: '1', type: 'bp_systolic', value: 120, unit: 'mmHg', timestamp: '2026-04-25T07:00:00' },
    ]);
    expect(await getYesterdayVitals('bp_systolic' as any)).toBeNull();
  });

  it('returns null when the storage call returns an empty list', async () => {
    freezeNow('2026-04-30T08:00:00');
    mockGetVitalsByType.mockResolvedValue([]);
    expect(await getYesterdayVitals('bp_systolic' as any)).toBeNull();
  });

  it('does not consider readings from earlier days as "yesterday"', async () => {
    freezeNow('2026-04-30T08:00:00');
    mockGetVitalsByType.mockResolvedValue([
      { id: '1', type: 'heart_rate', value: 70, unit: 'bpm', timestamp: '2026-04-28T07:00:00' },
      { id: '2', type: 'heart_rate', value: 72, unit: 'bpm', timestamp: '2026-04-27T07:00:00' },
    ]);
    expect(await getYesterdayVitals('heart_rate' as any)).toBeNull();
  });

  it('honours the patientId argument when provided', async () => {
    freezeNow('2026-04-30T08:00:00');
    mockGetVitalsByType.mockResolvedValue([]);
    await getYesterdayVitals('bp_diastolic' as any, 'mom');
    expect(mockGetVitalsByType).toHaveBeenCalledWith('bp_diastolic', 'mom');
  });

  it('returns null when the storage layer throws', async () => {
    freezeNow('2026-04-30T08:00:00');
    mockGetVitalsByType.mockRejectedValue(new Error('boom'));
    expect(await getYesterdayVitals('bp_systolic' as any)).toBeNull();
  });

  it('handles the timezone edge: yesterday is "calendar yesterday in local time"', async () => {
    // 2026-04-30T01:00 local — yesterday window is 2026-04-29 00:00 → 23:59.
    freezeNow('2026-04-30T01:00:00');
    mockGetVitalsByType.mockResolvedValue([
      { id: '1', type: 'bp_systolic', value: 119, unit: 'mmHg', timestamp: '2026-04-29T23:30:00' },
    ]);
    const result = await getYesterdayVitals('bp_systolic' as any);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(119);
  });
});
