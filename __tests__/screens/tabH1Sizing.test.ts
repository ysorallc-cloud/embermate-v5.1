// ============================================================================
// Tab H1 sizing — Phase 3.6.3.
//
// 3.6.2 compressed Now's greeting title to fontSize 22 with weight 500 +
// letterSpacing -0.3. 3.6.3 applies the same H1 contract to the
// remaining three tabs for visual consistency.
//
// Tab → H1 source:
//   Now         → components/now/NowGreeting.tsx :: title
//   Journal     → app/(tabs)/journal.tsx :: headerTitle
//   Insights    → components/ScreenHeader.tsx :: title (used by understand)
//   You         → app/(tabs)/support.tsx :: greeting  (Phase 29 F1 —
//                                            retired `title`, replaced
//                                            with Georgia italic
//                                            `greeting` block; the 22pt
//                                            cross-tab invariant is
//                                            preserved.)
//
// Note on ScreenHeader: it's also consumed by ~20 sub-screens (log
// forms, care-report, etc.). Updating its title to 22pt cascades. The
// sub-screens benefit from the same compression — they generally
// don't need a hero-sized title — so this is treated as a feature
// rather than a side-effect. Any sub-screen that needs the larger
// hero size can override locally.
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
  { tab: 'Now', file: 'components/now/NowGreeting.tsx', styleName: 'title' },
  { tab: 'Journal', file: 'app/(tabs)/journal.tsx', styleName: 'headerTitle' },
  { tab: 'Insights', file: 'components/ScreenHeader.tsx', styleName: 'title' },
  { tab: 'You', file: 'app/(tabs)/support.tsx', styleName: 'greeting' },
];

describe('Phase 3.6.3 — unified H1 sizing across all four tabs', () => {
  describe.each(SOURCES)('$tab tab', ({ file, styleName }) => {
    const src = read(file);
    const body = extractStyleBody(src, styleName);

    it('H1 style block exists', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it('fontSize is 22 (the canonical H1 size)', () => {
      expect(num(body, 'fontSize')).toBe(22);
    });
  });

  it('no tab H1 uses fontSize ≥ 28 (heroes capped at 22)', () => {
    for (const { file, styleName } of SOURCES) {
      const src = read(file);
      const body = extractStyleBody(src, styleName);
      const fs = num(body, 'fontSize');
      expect(fs).not.toBeNull();
      expect(fs as number).toBeLessThan(28);
    }
  });
});
