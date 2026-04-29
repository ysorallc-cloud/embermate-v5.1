// ============================================================================
// Wellness — A Gentle Nudge: trigger logic + dismissal persistence.
// ============================================================================

const mockSet = jest.fn();
const mockGet = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (k: string, v: string) => mockSet(k, v),
  getItem: (k: string) => mockGet(k),
}));

import {
  shouldShowNudge,
  isNudgeDismissedToday,
  dismissNudgeForToday,
} from '../../utils/wellnessNudge';

beforeEach(() => {
  mockSet.mockReset();
  mockGet.mockReset();
});

describe('shouldShowNudge — trigger logic', () => {
  it('long-absence trigger fires at 7+ days without a check-in', () => {
    const result = shouldShowNudge({
      daysSinceLastCheckIn: 9,
      toughDaysLast14: 0,
      breathSessionsLast30: 1,
    });
    expect(result?.trigger).toBe('long-absence');
    expect(result?.headline).toBe('It’s been a stretch.');
  });

  it('tough-stretch trigger fires at 5+ tough/getting-by days in 14', () => {
    const result = shouldShowNudge({
      daysSinceLastCheckIn: 1,
      toughDaysLast14: 6,
      breathSessionsLast30: 1,
    });
    expect(result?.trigger).toBe('tough-stretch');
    expect(result?.headline).toBe('This week’s been heavy.');
  });

  it('no-breath trigger fires when 0 sessions + any tough signal', () => {
    const result = shouldShowNudge({
      daysSinceLastCheckIn: 2,
      toughDaysLast14: 1,
      breathSessionsLast30: 0,
    });
    expect(result?.trigger).toBe('no-breath');
    expect(result?.headline).toBe('You haven’t paused much.');
  });

  it('returns null when the caregiver is doing fine (no condition matches)', () => {
    expect(
      shouldShowNudge({
        daysSinceLastCheckIn: 1,
        toughDaysLast14: 0,
        breathSessionsLast30: 5,
      }),
    ).toBeNull();
  });

  it('returns null when there has never been a check-in but no other signal', () => {
    expect(
      shouldShowNudge({
        daysSinceLastCheckIn: null,
        toughDaysLast14: 0,
        breathSessionsLast30: 0,
      }),
    ).toBeNull();
  });

  it('long-absence wins over no-breath when both apply', () => {
    const result = shouldShowNudge({
      daysSinceLastCheckIn: 14,
      toughDaysLast14: 1,
      breathSessionsLast30: 0,
    });
    expect(result?.trigger).toBe('long-absence');
  });
});

describe('Nudge dismissal — persists for the rest of the calendar day', () => {
  it('dismissNudgeForToday writes a date-keyed flag', async () => {
    mockSet.mockResolvedValue(undefined);
    await dismissNudgeForToday(new Date('2026-04-29T15:00:00'));
    expect(mockSet).toHaveBeenCalledWith('wellnessNudgeDismissed:2026-04-29', 'true');
  });

  it('isNudgeDismissedToday returns true after the flag is set', async () => {
    mockGet.mockResolvedValue('true');
    expect(await isNudgeDismissedToday(new Date('2026-04-29'))).toBe(true);
  });

  it('isNudgeDismissedToday returns false on the next calendar day (rolled over)', async () => {
    // Use noon-anchored dates so any local TZ still resolves to the
    // intended calendar day key.
    const day29 = new Date('2026-04-29T12:00:00');
    const day30 = new Date('2026-04-30T12:00:00');
    mockGet.mockImplementation((k: string) =>
      k === 'wellnessNudgeDismissed:2026-04-29' ? Promise.resolve('true') : Promise.resolve(null),
    );
    expect(await isNudgeDismissedToday(day29)).toBe(true);
    expect(await isNudgeDismissedToday(day30)).toBe(false);
  });
});
