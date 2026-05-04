// ============================================================================
// StatRings hairline grouping — Phase 3.8.1.
//
// Phase 2 of the May 1 sizing pass removed the surrounding glass card from
// the stat-tile row to avoid card-in-card weight against the (then
// near-black) page bg. The Phase 0 lockstep lift changed the visual math:
// against the warm-charcoal page, the four orbs read as floating, with
// no clear "this is one section" signal.
//
// 3.8.1 fix: a top + bottom 0.5px rule on the container groups the orbs
// as a section without re-introducing card weight (the page already
// carries the schedule card and end-of-shift card). Hairlines extend
// full page-width — no side borders, no fill, no radius. The
// page-edge contract from Phase 3 (paddingHorizontal: 14 on the screen
// ScrollView) handles horizontal containment naturally.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'components/now/StatRings.tsx'), 'utf8');

function extractStyleBody(name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  // Strip whole-line `//` comments so prose mentions of style props
  // ("see paddingHorizontal in the rationale above") don't trigger
  // negative assertions designed for actual style assignments.
  return src
    .slice(start, i - 1)
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

describe('Phase 3.8.1 — StatRings hairline grouping', () => {
  const container = extractStyleBody('container');

  it('container exists in the StyleSheet', () => {
    expect(container.length).toBeGreaterThan(0);
  });

  it('top hairline: borderTopWidth 0.5, color c.glassBorder', () => {
    expect(container).toMatch(/borderTopWidth:\s*0\.5\b/);
    expect(container).toMatch(/borderTopColor:\s*c\.glassBorder\b/);
  });

  it('bottom hairline: borderBottomWidth 0.5, color c.glassBorder', () => {
    expect(container).toMatch(/borderBottomWidth:\s*0\.5\b/);
    expect(container).toMatch(/borderBottomColor:\s*c\.glassBorder\b/);
  });

  it('does NOT set backgroundColor (hairlines are not a card surface)', () => {
    expect(container).not.toMatch(/backgroundColor:/);
  });

  it('does NOT set borderLeftWidth or borderRightWidth (page-edge handles horizontal)', () => {
    expect(container).not.toMatch(/borderLeftWidth:/);
    expect(container).not.toMatch(/borderRightWidth:/);
  });

  it('does NOT set borderRadius (hairlines are not a card)', () => {
    expect(container).not.toMatch(/borderRadius:/);
  });

  it('does NOT set paddingHorizontal (screen-level edge contract owns this)', () => {
    expect(container).not.toMatch(/paddingHorizontal:/);
  });

  it('paddingVertical routes through Sizing.cardInternalPadding (12pt)', () => {
    expect(container).toMatch(/paddingVertical:\s*Sizing\.cardInternalPadding\b/);
  });

  it('marginTop / marginBottom remain on Spacing.md', () => {
    expect(container).toMatch(/marginTop:\s*Spacing\.md\b/);
    expect(container).toMatch(/marginBottom:\s*Spacing\.md\b/);
  });

  it('keeps flexDirection: row + gap: 8 (4-tile single row)', () => {
    expect(container).toMatch(/flexDirection:\s*['"]row['"]/);
    expect(container).toMatch(/gap:\s*8\b/);
  });
});
