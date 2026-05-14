// ============================================================================
// Phase 26 F2 — Tab-bar hairline divider between Insights and You.
//
// Pre-26 the tabBarBackground returned a single BlurView (iOS) or null
// (Android), producing a continuous bar with no visual marker between
// operational tabs and the caregiver lane.
//
// Phase 26 F2 extends tabBarBackground to a wrapping View that renders
// (1) the existing BlurView on iOS, and (2) a 1px hairline at left: '75%'
// — the 3/4 boundary of the 4-tab equal-width layout, sitting between
// Insights (3rd) and You (4th). The hairline uses colors.glassBorder
// (same token as the existing tab-bar top border) so it reads as a
// structural marker rather than a decorative accent.
//
// Pinned contracts:
//   1. tabBarBackground returns JSX that includes a positioned 1px-wide
//      View with left: '75%'.
//   2. The divider uses colors.glassBorder (quiet token), not a bright
//      accent.
//   3. The BlurView still renders inside tabBarBackground on iOS — F2
//      is additive, not a replacement of the existing blur atmosphere.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/_layout.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

// Extract the body of tabBarBackground: () => ( ... ),
// Robust against nested parens by counting depth from the opening `(`.
function tabBarBackgroundBody(): string {
  const headRe = /tabBarBackground:\s*\(\)\s*=>\s*\(/;
  const headMatch = STRIPPED.match(headRe);
  if (!headMatch || headMatch.index === undefined) return '';
  const startIdx = headMatch.index + headMatch[0].length;
  let depth = 1;
  let i = startIdx;
  while (i < STRIPPED.length && depth > 0) {
    if (STRIPPED[i] === '(') depth += 1;
    else if (STRIPPED[i] === ')') depth -= 1;
    i += 1;
  }
  return STRIPPED.slice(startIdx, i - 1);
}

describe('Phase 26 F2 — tab-bar hairline divider', () => {
  it('contract 1: tabBarBackground renders a 1px-wide divider positioned at left: "75%"', () => {
    const body = tabBarBackgroundBody();
    expect(body.length).toBeGreaterThan(0);
    expect(body).toMatch(/position:\s*['"]absolute['"]/);
    expect(body).toMatch(/left:\s*['"]75%['"]/);
    expect(body).toMatch(/width:\s*1[,\s}]/);
  });

  it('contract 2: the divider uses colors.glassBorder (structural marker, not accent)', () => {
    const body = tabBarBackgroundBody();
    expect(body).toMatch(/backgroundColor:\s*colors\.glassBorder/);
  });

  it('contract 3: the BlurView still renders inside tabBarBackground on iOS (additive change)', () => {
    const body = tabBarBackgroundBody();
    expect(body).toMatch(/<BlurView/);
    // Defensive: the iOS gate stays in place; the divider must not
    // accidentally replace the platform check that scoped the blur.
    expect(body).toMatch(/Platform\.OS\s*===\s*['"]ios['"]/);
  });
});
