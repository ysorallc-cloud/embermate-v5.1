// ============================================================================
// Phase 5.13.1.e — resetSampleBannerMode wipes the banner-mode key so a
// fresh sample-data load defaults the banner to expanded ('full').
// ============================================================================

const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    removeItem: (k: string) => mockRemoveItem(k),
    // Other methods sampleDataManager touches at module load — stubs.
    multiRemove: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
    getAllKeys: jest.fn(() => Promise.resolve([])),
  },
}));

import { resetSampleBannerMode } from '../../utils/sampleDataManager';
import { StorageKeys } from '../../utils/storageKeys';

beforeEach(() => {
  mockRemoveItem.mockReset();
  mockRemoveItem.mockResolvedValue(undefined);
});

describe('resetSampleBannerMode — Phase 5.13.1.e', () => {
  it('removes the SAMPLE_BANNER_MODE key', async () => {
    await resetSampleBannerMode();
    expect(mockRemoveItem).toHaveBeenCalledWith(StorageKeys.SAMPLE_BANNER_MODE);
  });

  it('swallows errors quietly (the banner reset is best-effort)', async () => {
    mockRemoveItem.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(resetSampleBannerMode()).resolves.toBeUndefined();
  });
});
