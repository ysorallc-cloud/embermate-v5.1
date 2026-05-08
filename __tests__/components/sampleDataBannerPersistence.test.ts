// ============================================================================
// Phase 5.13.h — SampleDataBanner persists until sample data is cleared.
//
// Pre-5.13.h, the banner auto-hid as soon as `first_real_log_timestamp`
// was set. With the new wizard flow, real logs can land while sample
// data is still present (e.g. if the user logs in real mode but has not
// yet completed the sample-data clear path). The banner must persist
// until hasSampleData() returns false; the only legitimate hide signal
// is the sampleDataCleared event.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/common/SampleDataBanner.tsx'),
  'utf8',
);

describe('Phase 5.13.h — SampleDataBanner persists past first real log', () => {
  it('no longer reads first_real_log_timestamp', () => {
    expect(src).not.toMatch(/first_real_log_timestamp/);
  });

  it('does not contain a "first real log" auto-hide branch', () => {
    // The legacy comment that documented the auto-hide should be gone.
    expect(src).not.toMatch(/Auto-hide if user has started entering real data/);
  });

  it('still gates visibility on hasSampleData()', () => {
    expect(src).toMatch(/hasSampleData\(\)/);
  });

  it('still listens for the sampleDataCleared event to hide', () => {
    expect(src).toMatch(/sampleDataCleared/);
  });
});
