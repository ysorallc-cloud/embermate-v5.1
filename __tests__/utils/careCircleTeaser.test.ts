/**
 * Care Circle teaser visibility logic.
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

function setupMocks(days: number, dismissed: string | null = null, joined: string | null = null) {
  mockGetDays.mockResolvedValue(days);
  mockGetItem.mockImplementation((key: string) => {
    if (key === 'embermate.careCircle.teaserDismissed') return Promise.resolve(dismissed) as any;
    if (key === 'embermate.careCircle.earlyAccessJoined') return Promise.resolve(joined) as any;
    return Promise.resolve(null) as any;
  });
}

describe('shouldShowTeaser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns false when user has 0 days of logged activity', async () => {
    setupMocks(0);
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns false when user has 13 days of logged activity', async () => {
    setupMocks(13);
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns true when user has 14+ days of logged activity', async () => {
    setupMocks(14);
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('returns true when user has 30 days of logged activity', async () => {
    setupMocks(30);
    expect(await shouldShowTeaser()).toBe(true);
  });

  it('returns false if user has previously dismissed the teaser', async () => {
    setupMocks(20, 'true');
    expect(await shouldShowTeaser()).toBe(false);
  });

  it('returns false if user has already joined the early-access list', async () => {
    setupMocks(20, null, 'true');
    expect(await shouldShowTeaser()).toBe(false);
  });
});
