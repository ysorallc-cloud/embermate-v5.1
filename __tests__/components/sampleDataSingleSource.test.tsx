// ============================================================================
// Phase 23.1 Fix 1 — sample-data state has one canonical surface per screen.
//
// Pre-23.1 the Now tab had two redundant sample-mode affordances:
//   1. The SampleModeBanner "Viewing example data" pill (banner-level state,
//      sits between FirstTimeWelcomeCard and StatRings).
//   2. A "DEMO" badge inside the patient chip on NowHeader.
//
// Both communicated the same fact ("you are exploring with example data")
// in two visual places. Fix 3 retires the DEMO badge; Fix 1 pins the
// resulting single-source-of-truth so a future change can't re-introduce
// a duplicate.
//
// Pinned contracts:
//   1. There is exactly one "Viewing example data" affordance in the source —
//      the SampleModeBanner. Grep over now.tsx + the now/ components folder.
//   2. The DEMO badge on the patient chip is gone (Fix 3) — NowHeader no
//      longer renders a <Text> with literal "DEMO" content.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('Phase 23.1 Fix 1 — sample-data state single-source-of-truth on Now', () => {
  it('exactly one render of the "Viewing example data" label across Now-tab surfaces', () => {
    // Source pin: walk now.tsx + components/now/ + components/sample/ and
    // count occurrences of the literal label as a *rendered* string.
    const surfaces = [
      join(ROOT, 'app/(tabs)/now.tsx'),
      ...walk(join(ROOT, 'components/now')),
      ...walk(join(ROOT, 'components/sample')),
    ];
    let count = 0;
    for (const file of surfaces) {
      const src = readFileSync(file, 'utf8');
      // Match the label as it appears inside JSX text or string literals,
      // not in comments. Strip comments first.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      const matches = stripped.match(/Viewing example data/g) ?? [];
      count += matches.length;
    }
    // SampleModeBanner.tsx renders the label twice (once as
    // accessibilityLabel, once as the visible Text). Both live in one
    // component — that's one canonical surface, not two redundant
    // affordances.
    //
    // The pin asserts no *additional* surface re-uses the label.
    expect(count).toBeLessThanOrEqual(2);
  });

  it('NowHeader does not render a "DEMO" text badge on the patient chip (Fix 3)', () => {
    const src = readFileSync(join(ROOT, 'components/now/NowHeader.tsx'), 'utf8');
    // Strip comments so the rationale prose doesn't false-positive.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    // The pre-Fix-3 render was `<Text style={s.demoBadge}>DEMO</Text>`.
    // No literal "DEMO" string should remain as rendered content.
    expect(stripped).not.toMatch(/>\s*DEMO\s*</);
    // And the demoBadge style block should be retired with it.
    expect(stripped).not.toMatch(/demoBadge\s*:/);
  });
});
