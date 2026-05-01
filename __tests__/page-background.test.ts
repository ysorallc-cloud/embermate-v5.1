// ============================================================================
// Page background contract — flat #1f201c on every tab (Phase 0 lift).
//
// May 1 screenshots showed 4 visibly different page backgrounds because each
// tab was applying its own AuroraBackground variant (gradient stops in
// sage / lavender / amber). Phase 2 of the May 1 sizing pass: every tab's
// outermost container is the flat warm Sage near-black, no per-tab
// gradient. Atmosphere comes from typography (serif italic affirmations),
// not coloured gradients.
//
// Source-level test rather than mount-based: the 4 tab files import dozens
// of dependencies that would all need to be stubbed for a per-tab mount
// pass; checking the source for the absence of <AuroraBackground / and
// <LinearGradient is just as authoritative for this contract.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const TABS = [
  'app/(tabs)/now.tsx',
  'app/(tabs)/journal.tsx',
  'app/(tabs)/understand.tsx',
  'app/(tabs)/support.tsx',
];

const TAB_LAYOUT = 'app/(tabs)/_layout.tsx';

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Page background — flat #1f201c on every tab', () => {
  for (const file of TABS) {
    describe(file, () => {
      const src = read(file);

      it('does NOT render <AuroraBackground at the tab level', () => {
        expect(src).not.toMatch(/<AuroraBackground\b/);
      });

      it('does NOT render <LinearGradient at the tab level', () => {
        expect(src).not.toMatch(/<LinearGradient\b/);
      });

      it('does NOT render <RadialGradient or <ImageBackground', () => {
        expect(src).not.toMatch(/<RadialGradient\b/);
        expect(src).not.toMatch(/<ImageBackground\b/);
      });

      it('the screen root style references c.background (or colors.background)', () => {
        // Every tab's createStyles factory has a `root` style with
        // backgroundColor on the page bg token.
        expect(src).toMatch(
          /(root|container):\s*\{[^}]*backgroundColor:\s*c\.background/s,
        );
      });
    });
  }
});

describe('Page background — tab layout has no gradient', () => {
  const src = read(TAB_LAYOUT);

  it('tab layout does NOT render <LinearGradient or AuroraBackground', () => {
    expect(src).not.toMatch(/<LinearGradient\b/);
    expect(src).not.toMatch(/<AuroraBackground\b/);
  });
});
