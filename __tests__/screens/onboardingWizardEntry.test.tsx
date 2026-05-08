// ============================================================================
// Phase 5.13.f — onboarding routes "Set up my loved one" to the wizard.
//
// completeOnboarding(false) now lands on /care-plan/setup/who?from=onboarding
// instead of /(tabs)/now. The seedData === true branch is unchanged —
// sample-mode users transition into the wizard later via the banner.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'app/(onboarding)/index.tsx'),
  'utf8',
);

describe('Phase 5.13.f — onboarding routes real-mode path to wizard', () => {
  it('completeOnboarding navigates to the wizard for the real-mode branch', () => {
    expect(src).toMatch(/care-plan\/setup\/who/);
  });

  it('passes from=onboarding to the wizard', () => {
    expect(src).toMatch(/from:\s*['"]onboarding['"]/);
  });

  it('preserves the legacy /(tabs)/now route for the seedData === true (sample) branch', () => {
    // Sample-mode users still land on Now after seeding; they pick up
    // the wizard later via the banner. Only the seedData === false
    // branch was retargeted.
    expect(src).toMatch(/\/\(tabs\)\/now/);
  });
});
