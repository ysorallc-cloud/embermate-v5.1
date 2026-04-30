// ============================================================================
// hydrationRepo — wraps `hydration_logged` events for one-tap cup logging
// (Now tab + Reminders integration).
// ============================================================================

const mockSaveEvent = jest.fn();
const mockGetEventsByDate = jest.fn();
const mockGetEventsByDateRange = jest.fn();

jest.mock('../../storage/eventRepo', () => ({
  saveEvent: (e: any) => mockSaveEvent(e),
  getEventsByDate: (...args: any[]) => mockGetEventsByDate(...args),
  getEventsByDateRange: (...args: any[]) => mockGetEventsByDateRange(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import {
  addCup,
  getDayTotal,
  getHistory,
} from '../../storage/hydrationRepo';

beforeEach(() => {
  mockSaveEvent.mockReset();
  mockGetEventsByDate.mockReset();
  mockGetEventsByDateRange.mockReset();
});

describe('addCup', () => {
  it('emits a hydration_logged event with cups=1 by default', async () => {
    mockSaveEvent.mockResolvedValue({ id: 'evt-1' });
    await addCup('mom');
    expect(mockSaveEvent).toHaveBeenCalledTimes(1);
    const arg = mockSaveEvent.mock.calls[0][0];
    expect(arg.type).toBe('hydration_logged');
    expect(arg.patientId).toBe('mom');
    expect(arg.value).toBe(1);
    expect(arg.metadata).toEqual({ cups: 1, unit: 'cups' });
  });

  it('records the source as "quick_log" so analytics distinguishes one-tap from manual', () => {
    mockSaveEvent.mockResolvedValue({ id: 'evt-1' });
    return addCup('mom').then(() => {
      expect(mockSaveEvent.mock.calls[0][0].source).toBe('quick_log');
    });
  });

  it('honours a custom cups argument (multi-cup add)', async () => {
    mockSaveEvent.mockResolvedValue({ id: 'evt-2' });
    await addCup('mom', 3);
    const arg = mockSaveEvent.mock.calls[0][0];
    expect(arg.value).toBe(3);
    expect(arg.metadata.cups).toBe(3);
  });

  it('rejects non-positive cup counts', async () => {
    await expect(addCup('mom', 0)).rejects.toThrow(/positive/i);
    await expect(addCup('mom', -1)).rejects.toThrow(/positive/i);
    expect(mockSaveEvent).not.toHaveBeenCalled();
  });
});

describe('getDayTotal', () => {
  it('sums cups across all hydration events on the given day', async () => {
    mockGetEventsByDate.mockResolvedValue([
      { type: 'hydration_logged', value: 1, metadata: { cups: 1 } },
      { type: 'hydration_logged', value: 2, metadata: { cups: 2 } },
      { type: 'medication_taken', value: undefined }, // ignored
      { type: 'hydration_logged', value: 1, metadata: { cups: 1 } },
    ]);
    const total = await getDayTotal('mom', '2026-04-30');
    expect(total).toBe(4);
  });

  it('returns 0 when no events exist for the day', async () => {
    mockGetEventsByDate.mockResolvedValue([]);
    expect(await getDayTotal('mom', '2026-04-30')).toBe(0);
  });

  it('falls back to event.value when metadata.cups is absent (legacy events)', async () => {
    mockGetEventsByDate.mockResolvedValue([
      { type: 'hydration_logged', value: 5 },
      { type: 'hydration_logged', value: 2 },
    ]);
    expect(await getDayTotal('mom', '2026-04-30')).toBe(7);
  });

  it('coerces non-numeric values to 0 instead of crashing', async () => {
    mockGetEventsByDate.mockResolvedValue([
      { type: 'hydration_logged', value: 1 },
      { type: 'hydration_logged', value: 'NaN-string' },
      { type: 'hydration_logged', metadata: {} },
    ]);
    expect(await getDayTotal('mom', '2026-04-30')).toBe(1);
  });

  it('returns 0 when the underlying repo throws', async () => {
    mockGetEventsByDate.mockRejectedValue(new Error('boom'));
    expect(await getDayTotal('mom', '2026-04-30')).toBe(0);
  });
});

describe('getHistory', () => {
  it('returns a per-day map of cup totals across the requested range', async () => {
    mockGetEventsByDateRange.mockResolvedValue([
      { type: 'hydration_logged', timestamp: '2026-04-28T08:00:00Z', value: 1, metadata: { cups: 1 } },
      { type: 'hydration_logged', timestamp: '2026-04-28T15:00:00Z', value: 2, metadata: { cups: 2 } },
      { type: 'hydration_logged', timestamp: '2026-04-29T09:00:00Z', value: 4, metadata: { cups: 4 } },
      { type: 'medication_taken', timestamp: '2026-04-30T08:00:00Z', value: 1 }, // ignored
    ]);
    const history = await getHistory('mom', '2026-04-28', '2026-04-30');
    expect(history).toEqual({
      '2026-04-28': 3,
      '2026-04-29': 4,
      '2026-04-30': 0,
    });
  });

  it('returns an empty map when no events fall in the range', async () => {
    mockGetEventsByDateRange.mockResolvedValue([]);
    const history = await getHistory('mom', '2026-04-28', '2026-04-29');
    expect(history).toEqual({ '2026-04-28': 0, '2026-04-29': 0 });
  });

  it('skips events with a malformed timestamp', async () => {
    mockGetEventsByDateRange.mockResolvedValue([
      { type: 'hydration_logged', timestamp: 'not-a-date', value: 1 },
      { type: 'hydration_logged', timestamp: '2026-04-29T09:00:00Z', value: 2, metadata: { cups: 2 } },
    ]);
    const history = await getHistory('mom', '2026-04-29', '2026-04-29');
    expect(history).toEqual({ '2026-04-29': 2 });
  });
});
