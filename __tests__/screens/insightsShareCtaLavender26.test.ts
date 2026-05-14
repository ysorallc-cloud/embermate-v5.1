// ============================================================================
// Phase 26 F4 — Insights Share CTA carries the caregiver→clinician lane
// color.
//
// The Insights tab's "Share with Dr. X" / "Share these insights" button
// is the bridge from caregiver-recorded observations into clinician
// hands. That handoff lives in the same conceptual lane as the You tab
// and Journal's "Building toward Dr. Patel" feed-forward banner (which
// is already lavender). Pre-26 the button rendered with the sage
// operational accent — visually grouping it with the rest of Insights
// rather than with the caregiver-to-clinician handoff intent.
//
// Phase 26 F4 recolors the button background sage → lavender. The text
// color stays #0a0c0a (hardcoded near-black) — that pairing was already
// dark-on-light contrast and AAA against lavender too (~9.5:1).
//
// Pinned contracts:
//   1. shareCtaButton background routes through c.caregiverAccent (not
//      c.accent).
//   2. shareCtaButtonText color stays #0a0c0a — the existing dark
//      foreground reads AAA against the new lavender background; no
//      regression on contrast.
//   3. No other style block in understand.tsx flips sage → lavender as
//      a side-effect of this change (defends against an accidental
//      replace-all in a refactor that touched the file).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/understand.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{[\\s\\S]*?\\n\\s{2,4}\\}`, '');
  const m = STRIPPED.match(re);
  return m ? m[0] : '';
}

describe('Phase 26 F4 — Insights Share CTA lavender recolor', () => {
  it('contract 1: shareCtaButton backgroundColor routes through c.caregiverAccent', () => {
    const block = styleBlock('shareCtaButton');
    expect(block.length).toBeGreaterThan(0);
    expect(block).toMatch(/backgroundColor:\s*c\.caregiverAccent\b/);
    expect(block).not.toMatch(/backgroundColor:\s*c\.accent\b/);
  });

  it('contract 2: shareCtaButtonText color stays "#0a0c0a" (AAA against lavender)', () => {
    const block = styleBlock('shareCtaButtonText');
    expect(block.length).toBeGreaterThan(0);
    expect(block).toMatch(/color:\s*['"]#0a0c0a['"]/);
  });

  it('contract 3: only the shareCtaButton uses the strong caregiverAccent token', () => {
    // Pin the strong-lavender token (c.caregiverAccent) precisely. Word
    // boundary after Accent excludes the pre-Phase-26 AI Summary section
    // (lines ~1026/1034), which uses the SOFTER c.caregiverAccentLight
    // token — those are unrelated to F4 and predate it. If a future
    // refactor accidentally promotes another block to the strong token
    // (which would scramble the visual lane semantics), this pin breaks.
    const styleBlockMatch = STRIPPED.match(/const createStyles[\s\S]*$/);
    if (!styleBlockMatch) return;
    const styleSection = styleBlockMatch[0];
    const strongOccurrences = styleSection.match(/c\.caregiverAccent\b/g) ?? [];
    // Conservative ceiling: 2 (the backgroundColor reference + at most
    // one defensive reference in a future hover/pressed variant). Three
    // or more = something else got lavendered with the strong token.
    expect(strongOccurrences.length).toBeLessThanOrEqual(2);
    // And the F4 reference itself is present — sanity check.
    expect(strongOccurrences.length).toBeGreaterThanOrEqual(1);
  });
});
