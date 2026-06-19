// ============================================================================
// Onboarding flow integration — AsYouUseScreen RETIRED from main flow.
//
// Original Prompt 7 / Phase 16.3 intent: AsYouUseScreen integrated as
// the last-but-one screen between MeetSampleScreen and GetStartedScreen
// in a 5-screen flow.
//
// Pre-launch redesign C4 retires AsYouUseScreen (and MeetSampleScreen +
// GetStartedScreen) from the main onboarding flow entirely. The new
// 4-screen flow is Welcome (C1) → Privacy (C2) → Name (C3) → Landing
// (C4). The retired screen files remain on disk as orphan source per
// the established pattern; a separate cleanup pass can sweep them.
//
// This file is preserved (not deleted) so the migration is visible in
// the git history at the same path. The active four-screen flow
// contracts live in
// __tests__/screens/onboardingLandingRedesignC4.test.ts.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const onboardingSrc = readFileSync(join(ROOT, 'app/(onboarding)/index.tsx'), 'utf8');

describe('Onboarding redesign C4 — AsYouUseScreen retired from main flow', () => {
  it('no longer imports AsYouUseScreen', () => {
    expect(onboardingSrc).not.toMatch(/from\s+['"]\.\/screens\/AsYouUseScreen['"]/);
  });

  it('no longer renders <AsYouUseScreen /> in the flow', () => {
    expect(onboardingSrc).not.toMatch(/<AsYouUseScreen/);
  });

  it('declares the 5-screen flow (Welcome → Privacy → Name → WatchingFor → Landing)', () => {
    const block = onboardingSrc.match(/ONBOARDING_SCREENS\s*=\s*\[([\s\S]*?)\]/);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("'Welcome'");
    expect(block![1]).toContain("'Privacy'");
    expect(block![1]).toContain("'Name'");
    expect(block![1]).toContain("'WatchingFor'"); // onboarding-personalize Q2
    expect(block![1]).toContain("'Landing'");
    expect(block![1]).not.toContain("'As You Use'");
    const idMatches = block![1].match(/id:\s*['"`]\d+['"`]/g) ?? [];
    expect(idMatches.length).toBe(5);
  });
});
