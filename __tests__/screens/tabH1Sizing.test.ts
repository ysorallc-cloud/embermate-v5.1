// ============================================================================
// Tab H1 sizing — Phase 3.6.3 → Phase 33 F4+F5+F6 reframe.
//
// Phase 3.6.3 (May 3) compressed all four tab H1s to a unified 22pt
// register. Phase 33 F4+F5+F6 (2026-05-17) retired that uniform
// invariant in favor of a register split aligned to the website
// source-of-truth:
//
//   • Informational tab labels via ScreenHeader (Journal, Insights):
//     32pt regular-weight Source Serif 4.
//   • Witness-voice tab greeting (You/Support): 22pt italic Source
//     Serif 4 — size unchanged from Phase 29 F1, just the font-family
//     token swap.
//   • NowGreeting sub-component: 22pt sans (Phase 33 did NOT touch
//     this — it's a Now-hero sub-element, not the page-level H1; Now
//     has no top-of-page H1 since the hero block leads with content).
//
// Q-33.5 refined rule: informational labels carry regular-weight
// serif; italic stays reserved for witness voice. The size split (32pt
// label vs 22pt greeting) makes the hierarchy clear.
//
// Per-source pins below replace the prior "all four = 22pt"
// invariant. Safety net intact — each H1 has a defined expected size
// so random sizes can't sneak in.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function extractStyleBody(src: string, name: string): string {
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
  return src.slice(start, i - 1);
}

function num(body: string, prop: string): number | null {
  const m = body.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

const SOURCES = [
  { tab: 'Now (NowGreeting sub-component)', file: 'components/now/NowGreeting.tsx', styleName: 'title', expectedSize: 22 },
  { tab: 'Journal (via ScreenHeader)', file: 'components/ScreenHeader.tsx', styleName: 'title', expectedSize: 32 },
  { tab: 'Insights (via ScreenHeader)', file: 'components/ScreenHeader.tsx', styleName: 'title', expectedSize: 32 },
  { tab: 'You (Support greeting)', file: 'app/(tabs)/support.tsx', styleName: 'greeting', expectedSize: 22 },
];

describe('Phase 33 F4+F5+F6 — tab H1 sizing per register split', () => {
  describe.each(SOURCES)('$tab', ({ file, styleName, expectedSize }) => {
    const src = read(file);
    const body = extractStyleBody(src, styleName);

    it('H1 style block exists', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it(`fontSize is ${expectedSize} (Phase 33 register split)`, () => {
      expect(num(body, 'fontSize')).toBe(expectedSize);
    });
  });

  it('every tab H1 sits in the 22-32 range (no random sizes sneak in)', () => {
    for (const { file, styleName } of SOURCES) {
      const src = read(file);
      const body = extractStyleBody(src, styleName);
      const fs = num(body, 'fontSize');
      expect(fs).not.toBeNull();
      expect(fs as number).toBeGreaterThanOrEqual(22);
      expect(fs as number).toBeLessThanOrEqual(32);
    }
  });
});
