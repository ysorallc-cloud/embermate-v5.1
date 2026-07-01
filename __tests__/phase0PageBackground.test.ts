// ============================================================================
// Page background lockstep — Phase 0 → Phase 33 → slice-1-superseded chain.
//
// Phase 0 (v6.7 May 1) lifted the page bg from #141612 → #1f201c — a
// calibrated half-step toward charcoal to hold the warm cast without
// reading washed-out on device.
//
// Phase 33 F1a (2026-05-17) realigned to the website source-of-truth
// `--bg: #141a16` — deeper warm-brown than the Phase-0 sage-charcoal.
//
// Slice-1 (commit 07843628, 2026-06-13) briefly dropped to #0d0b08 to
// pair with a schedule-floats-on-page-bg restructure. SUPERSEDED the
// same day by the embermate-now-full-approved visual target: warm
// v6.7 #141a16 stays the page bg ("rest" surface / warm gutter), and
// a new `zonePanel` token (#19211b) handles the quiet panel surface
// for the Now zone wrappers. Migration chain settles at
// #141612 → #1f201c → #141a16 → [#0d0b08 superseded] → #141a16.
//
// This is a TOKEN-LEVEL contract: the dark theme's `background` value
// is the canonical page-bg, and `tabBarBackground` mirrors it. Both
// must flip in lockstep so the tab strip and page surface stay
// seamless.
//
// Pins:
//   • DarkColors.background       === '#141a16'   (warm restore)
//   • DarkColors.tabBarBackground === '#141a16'   (lockstep)
//   • The old #141612 literal does NOT appear as an active value in
//     theme-tokens (comments are allowed for migration narrative).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { getDarkColors } from '../theme/theme-tokens';

const DarkColors = getDarkColors();

const ROOT = join(__dirname, '..');
const tokensSrc = readFileSync(join(ROOT, 'theme/theme-tokens.ts'), 'utf8');

describe('Page background lockstep — warm-restore target #141a16', () => {
  it('DarkColors.background is #141a16 (warm v6.7 restored)', () => {
    expect(DarkColors.background).toBe('#141a16');
  });

  it('DarkColors.tabBarBackground mirrors the page bg (#141a16)', () => {
    expect(DarkColors.tabBarBackground).toBe('#141a16');
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
