// ============================================================================
// Tab H1 sizing — Phase 3.6.3 → Phase 33 F4+F5+F6 → Phase 33b Scope 1.
//
// Phase 3.6.3 (May 3) compressed all four tab H1s to a unified 22pt
// register. Phase 33 F4+F5+F6 (2026-05-17) retired that uniform
// invariant in favor of a register split. Phase 33b Scope 1
// (2026-05-18) further reframed greeting blocks to website canon
// per `.phone-greeting` — 26pt regular-serif, symmetric across
// Now + You:
//
//   • Informational tab labels via ScreenHeader (Insights) +
//     Journal inline header (post-F4.1): 32pt regular serif.
//   • Greeting blocks (Now + You/Support): 26pt regular serif,
//     letterSpacing -0.5 per website `.phone-greeting` canon. F6's
//     italic-serif greeting retired in Phase 33b Scope 1 — italic
//     register moved to the separate Subhead component (ships
//     empty/null in v1.0 per Path A).
//
// Per-source pins below replace the prior register-split table.
// Safety net intact — each H1 has a defined expected size so random
// sizes can't sneak in.
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
  { tab: 'Now greeting (Phase 33b Scope 1)', file: 'components/now/NowGreeting.tsx', styleName: 'title', expectedSize: 26 },
  { tab: 'Journal headerTitle (F4.1 inline)', file: 'app/(tabs)/journal.tsx', styleName: 'headerTitle', expectedSize: 32 },
  { tab: 'Insights (via ScreenHeader)', file: 'components/ScreenHeader.tsx', styleName: 'title', expectedSize: 32 },
  { tab: 'You (Support greeting, Phase 33b Scope 1)', file: 'app/(tabs)/support.tsx', styleName: 'greeting', expectedSize: 26 },
];

describe('Phase 33b Scope 1 — tab H1 sizing (greeting 26 / informational 32)', () => {
  describe.each(SOURCES)('$tab', ({ file, styleName, expectedSize }) => {
    const src = read(file);
    const body = extractStyleBody(src, styleName);

    it('H1 style block exists', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it(`fontSize is ${expectedSize} (Phase 33b register)`, () => {
      expect(num(body, 'fontSize')).toBe(expectedSize);
    });
  });

  it('every tab H1 sits in the 26-32 range (no random sizes sneak in)', () => {
    for (const { file, styleName } of SOURCES) {
      const src = read(file);
      const body = extractStyleBody(src, styleName);
      const fs = num(body, 'fontSize');
      expect(fs).not.toBeNull();
      expect(fs as number).toBeGreaterThanOrEqual(26);
      expect(fs as number).toBeLessThanOrEqual(32);
    }
  });
});
