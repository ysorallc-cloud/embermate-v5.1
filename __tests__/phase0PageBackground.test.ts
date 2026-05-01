// ============================================================================
// Phase 0 — Lift page background from #141612 to #1f201c.
//
// The May 1 device-side check on the prior pass showed the warm-dark base
// reading slightly washed-out; #1f201c is a calibrated half-step toward
// charcoal that holds the warm cast without losing depth. Phase 0 is the
// foundational flip — everything in Phases 1–7 sat on top of #141612, so
// the value gets lifted before any further visual work lands on top of it.
//
// This is a TOKEN-LEVEL contract: the dark theme's `background` value is
// the canonical page-bg, and `tabBarBackground` mirrors it. Both must
// flip in lockstep so the tab strip and page surface stay seamless.
//
// Pins:
//   • DarkColors.background       === '#1f201c'
//   • DarkColors.tabBarBackground === '#1f201c'
//   • The old #141612 literal does NOT appear as an active value in
//     theme-tokens (comments are allowed for migration narrative).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { getDarkColors } from '../theme/theme-tokens';

const DarkColors = getDarkColors();

const ROOT = join(__dirname, '..');
const tokensSrc = readFileSync(join(ROOT, 'theme/theme-tokens.ts'), 'utf8');

describe('Phase 0 — page background lifted to #1f201c', () => {
  it('DarkColors.background is #1f201c', () => {
    expect(DarkColors.background).toBe('#1f201c');
  });

  it('DarkColors.tabBarBackground mirrors the page bg (#1f201c)', () => {
    expect(DarkColors.tabBarBackground).toBe('#1f201c');
  });

  it('the old #141612 hex does NOT appear as an active token value', () => {
    // Strip line comments so narrative "// see #141612 history" lines pass.
    // Then assert no remaining hex literal #141612 sits on the right-hand
    // side of any property assignment.
    const stripped = tokensSrc
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(stripped).not.toMatch(/#141612/i);
  });
});
