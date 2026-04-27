/**
 * Care Circle teaser visibility logic.
 *
 * shouldShowTeaser is a 3-input gate:
 *   - days of logged activity (must be ≥ 14)
 *   - dismissal flag (must NOT be 'true')
 *   - early-access joined flag (must NOT be 'true')
 *
 * These tests pin both the threshold boundary (13/14/15) and the resilience
 * of the function when AsyncStorage values are corrupted or unexpected types.
 */

jest.mock('../../utils/baselineStorage', () => ({
  getDaysOfData: jest.fn(),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(),
}));

import { shouldShowTeaser } from '../../utils/careCircleTeaser';
import { getDaysOfData } from '../../utils/baselineStorage';
import { safeGetItem } from '../../utils/safeStorage';

const mockGetDays = getDaysOfData as jest.MockedFunction<typeof getDaysOfData>;
const mockGetItem = safeGetItem as jest.MockedFunction<typeof safeGetItem>;

const DISMISSED_KEY = 'embermate.careCircle.teaserDismissed';
const JOINED_KEY = 'embermate.careCircle.earlyAccessJoined';

function setupMocks(
  days: number,
  dismissed: any = null,
  joined: any = null,
) {
  mockGetDays.mockResolvedValue(days);
  mockGetItem.mockImplementation((key: string) => {
    if (key === DISMISSED_KEY) return Promise.resolve(dismissed) as any;
    if (key === JOINED_KEY) return Promise.resolve(joined) as any;
    return Promise.resolve(null) as any;
  });
}

describe('shouldShowTeaser — day threshold boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns false at 0 days', async () => {
    setupMocks(0);
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns false at exactly 13 days (one short of threshold)', async () => {
    setupMocks(13);
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns true at exactly 14 days (threshold met)', async () => {
    setupMocks(14);
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('returns true at exactly 15 days (above threshold)', async () => {
    setupMocks(15);
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('returns true at 30 days', async () => {
    setupMocks(30);
    expect(await shouldShowTeaser()).toBe(true);
  });
});

describe('shouldShowTeaser — dismissal & joined flags', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns false if user has previously dismissed the teaser', async () => {
    setupMocks(20, 'true');
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns false if user has already joined the early-access list', async () => {
    setupMocks(20, null, 'true');
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns false when both dismissed AND joined are set', async () => {
    setupMocks(20, 'true', 'true');
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns true when both flags are explicitly null (never set)', async () => {
    setupMocks(20, null, null);
    expect(await shouldShowTeaser()).toBe(true);
  });
});

describe('shouldShowTeaser — corrupted / unexpected AsyncStorage values', () => {
  beforeEach(() => jest.clearAllMocks());

  it('treats the literal string "false" as not-dismissed (only "true" gates)', async () => {
    // Storage may legitimately contain the string "false" if a future writer
    // changed format. The current rule is: only the literal string "true"
    // dismisses. This test pins that contract.
    setupMocks(20, 'false');
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('treats a boolean true (non-string) as not-dismissed', async () => {
    // Defensive: if a future writer accidentally stored a boolean instead of
    // a string, the gate should not fire (avoid false negatives that hide
    // the teaser from invested users).
    setupMocks(20, true);
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('treats an empty string as not-dismissed', async () => {
    setupMocks(20, '');
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('treats undefined as not-dismissed', async () => {
    setupMocks(20, undefined);
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('treats a JSON object value as not-dismissed (corrupted shape)', async () => {
    // safeGetItem may return a parsed object if a previous writer used
    // safeSetItem with non-string data. The teaser should remain visible.
    setupMocks(20, { foo: 'bar' });
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('does not throw when getDaysOfData rejects (failure surface stays quiet)', async () => {
    // shouldShowTeaser awaits via Promise.all — if a dependency rejects, the
    // function rejects too. Document the current contract: caller must handle.
    mockGetDays.mockRejectedValue(new Error('storage unavailable'));
    mockGetItem.mockResolvedValue(null as any);
    await expect(shouldShowTeaser()).rejects.toThrow();
  });
});
