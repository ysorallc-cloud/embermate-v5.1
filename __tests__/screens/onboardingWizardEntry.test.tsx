// ============================================================================
// Phase 5.13.f → Onboarding redesign C4 — wizard handoff RETIRED.
//
// Original Phase 5.13.f intent: completeOnboarding(false) lands on
// /care-plan/setup/who?from=onboarding instead of /(tabs)/now. That
// behavior was the pre-redesign wizard-driven onboarding shape.
//
// Pre-launch C4 retires the wizard handoff entirely:
//   • completeOnboarding writes ONBOARDING_COMPLETE + disclaimer_accepted
//     + calls writePatientName + generates the default care plan + lands
//     the user directly on /(tabs)/now.
//   • The wizard at /care-plan/setup stays UNTOUCHED but is reachable
//     post-onboarding from the Now tab's Care Plan link, not via
//     onboarding handoff.
//
// This file is preserved (not deleted) so the migration is visible in
// the git history at the same path. The active four-screen flow
// contracts live in
// __tests__/screens/onboardingLandingRedesignC4.test.ts.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'app/(onboarding)/index.tsx'),
  'utf8',
);

describe('Onboarding redesign C4 — wizard handoff retired', () => {
  it('completeOnboarding lands on /(tabs)/now (no wizard handoff)', () => {
    expect(src).toMatch(/router\.replace\(\s*['"]\/\(tabs\)\/now['"]/);
  });

  it('no longer passes from=onboarding to the wizard (the handoff is gone)', () => {
    // Forward-guard: if a future change reintroduces the wizard
    // handoff at completion, this contract catches it. The wizard
    // remains REACHABLE from the Now tab, just not via a hard
    // handoff at onboarding completion.
    expect(src).not.toMatch(/router\.replace\(\s*\{\s*pathname:\s*['"]\/care-plan\/setup\/who['"][\s\S]{0,200}from:\s*['"]onboarding['"]/);
  });

  it('preserves the three required onboarding writes (the C4 lock)', () => {
    expect(src).toMatch(/safeSetItem\s*\(\s*StorageKeys\.ONBOARDING_COMPLETE/);
    expect(src).toMatch(/safeSetItem\s*\(\s*['"]disclaimer_accepted['"]/);
    expect(src).toMatch(/writePatientName/);
  });
});
