// ============================================================================
// Onboarding flow — verifies AsYouUseScreen is integrated as the new
// last-but-one screen, between MeetSampleScreen and GetStartedScreen.
// (Prompt 7 Phase 2.)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const onboardingSrc = readFileSync(join(ROOT, 'app/(onboarding)/index.tsx'), 'utf8');

describe('Onboarding flow integration — AsYouUseScreen', () => {
  it('imports AsYouUseScreen', () => {
    expect(onboardingSrc).toMatch(/from\s+'\.\/screens\/AsYouUseScreen'/);
  });

  it('declares 6 onboarding screens (added "As You Use")', () => {
    const block = onboardingSrc.match(/ONBOARDING_SCREENS\s*=\s*\[([\s\S]*?)\]/);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("'As You Use'");
    // Six entries — count distinct id strings.
    const idMatches = block![1].match(/id:\s*['"`]\d+['"`]/g) ?? [];
    expect(idMatches.length).toBe(6);
  });

  it('renders <AsYouUseScreen /> at the new index 4 slot, before GetStarted', () => {
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
    // suppressed at the AsYouUse index.
    expect(onboardingSrc).toMatch(/currentIndex !== 4/);
  });
});
