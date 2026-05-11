// ============================================================================
// Onboarding flow — verifies AsYouUseScreen is integrated as the
// last-but-one screen, between MeetSampleScreen and GetStartedScreen.
// (Prompt 7 Phase 2; counts updated for Phase 16.3.)
//
// Phase 16.3 — flow narrowed 6 → 5 screens after WhoIsThisForScreen
// was cut. AsYouUse moved from index 4 → index 3 (penultimate, still
// between Meet and Get Started). The total ONBOARDING_SCREENS count
// is now 5.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const onboardingSrc = readFileSync(join(ROOT, 'app/(onboarding)/index.tsx'), 'utf8');

describe('Onboarding flow integration — AsYouUseScreen', () => {
  it('imports AsYouUseScreen', () => {
    expect(onboardingSrc).toMatch(/from\s+'\.\/screens\/AsYouUseScreen'/);
  });

  it('declares 5 onboarding screens (Phase 16.3 — was 6 before WhoIsThisFor cut)', () => {
    const block = onboardingSrc.match(/ONBOARDING_SCREENS\s*=\s*\[([\s\S]*?)\]/);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("'As You Use'");
    // Five entries post-16.3 — count distinct id strings.
    const idMatches = block![1].match(/id:\s*['"`]\d+['"`]/g) ?? [];
    expect(idMatches.length).toBe(5);
  });

  it('renders <AsYouUseScreen /> before GetStarted (index 3 after the 16.3 cut)', () => {
    // The flow advances by index, so AsYouUse must precede GetStarted.
    const asYouUseIdx = onboardingSrc.indexOf('<AsYouUseScreen');
    const getStartedIdx = onboardingSrc.indexOf('<GetStartedScreen');
    expect(asYouUseIdx).toBeGreaterThan(0);
    expect(getStartedIdx).toBeGreaterThan(asYouUseIdx);
  });

  it('AsYouUse onContinue advances to the next screen', () => {
    expect(onboardingSrc).toMatch(/<AsYouUseScreen onContinue=\{advanceToNext\}/);
  });

  it('hides the standard footer on the AsYouUse screen (it owns its own button)', () => {
    // The screen owns the Got it button, so the global footer should be
    // suppressed at the AsYouUse index (3 post-16.3, was 4 pre-cut).
    expect(onboardingSrc).toMatch(/currentIndex !== 3/);
  });
});
