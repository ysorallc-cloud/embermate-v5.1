// ============================================================================
// Phase 29 Batch C F7 — caregiver-wellness lane chrome migration contracts.
//
// Pins F5's source-level chrome changes:
//   • cardWeekFelt: Tier 3 primary lane chrome (matches ReflectionCard +
//     Phase 27/28 JournalSection caregiverAccent tint — same chrome
//     treatment across primary lane-coded cards in the app)
//   • cardRhythm: auxiliary neutral chrome (whisper white-rgba bg +
//     thin 3px left border at 0.20 alpha)
//   • cardHeader cream-strip retired (cross-tone orphan inside the
//     lavender + neutral card variants)
//   • rhythmCell dark inset tile wrapper (stat values scan as peers)
//   • nudgeCard migrated from sage rgba to LinearGradient lavender body
//     + caregiverAccentStrong border
//   • nudgePrimary CTA: sage bg + white text → caregiverAccent bg +
//     near-black text (~9.5:1 contrast, AAA — matches Phase 26 share
//     CTA pattern)
//   • Tier 1 sweep — no bare `c.accent` / `colors.accent` references
//     anywhere in the subscreen source (comments stripped before
//     search so changelog commentary doesn't false-positive)
//
// Also pins F1/F3 typography:
//   • caregiver-wellness uses SubScreenHeader title="Your wellness"
//     with titleVariant="serif" (already pinned in
//     caregiverWellness.test.ts; reaffirmed here as part of the
//     Batch C coherence pin)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'app/caregiver-wellness.tsx'), 'utf8');
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function styleBlock(name: string): string {
  // Capture-balanced match against the named style block. The wellness
  // file uses inline rgba strings inside style blocks (e.g. backgroundColor:
  // 'rgba(...)'), so the simple `\{([^}]*)\}` pattern below would close
  // early on the first `}`. Use a brace-counter walk instead.
  const opener = SRC.indexOf(`${name}: {`);
  if (opener < 0) return '';
  const start = opener + name.length + 3; // skip past "name: {"
  let depth = 1;
  let i = start;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth += 1;
    else if (SRC[i] === '}') depth -= 1;
    i += 1;
  }
  return SRC.slice(start, i - 1);
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Phase 29 Batch C F5 — caregiver-wellness card chrome migration', () => {
  it('cardWeekFelt: DE-PURPLED (S7) — neutral surface + sage left-rule', () => {
    const block = styleBlock('cardWeekFelt');
    expect(block).not.toBe('');
    expect(block).toMatch(/backgroundColor:\s*c\.surfaceAlt\b/);
    expect(block).toMatch(/borderColor:\s*c\.accentLight\b/);
    expect(num(block, 'borderWidth')).toBe(0.5);
    expect(num(block, 'borderLeftWidth')).toBe(3);
    expect(block).toMatch(/borderLeftColor:\s*c\.accent\b(?!\w)/);
    expect(block).not.toMatch(/caregiverAccent/);
    expect(num(block, 'borderRadius')).toBe(11);
    expect(num(block, 'padding')).toBe(16);
  });

  it('cardRhythm: auxiliary neutral chrome per spec 2.6', () => {
    const block = styleBlock('cardRhythm');
    expect(block).not.toBe('');
    expect(block).toMatch(/backgroundColor:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.035\)['"]/);
    expect(num(block, 'borderLeftWidth')).toBe(3);
    expect(block).toMatch(/borderLeftColor:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.20?\)['"]/);
    expect(num(block, 'borderRadius')).toBe(11);
    expect(num(block, 'padding')).toBe(16);
    // Absence pin — no full border (spec 2.6 specifies only the 3px left).
    expect(num(block, 'borderWidth')).toBeNull();
  });

  it('absence pin: shared `card` style retired (replaced by lane-coded variants)', () => {
    // Pre-C both cards shared `styles.card` with c.glass + c.glassBorder
    // chrome. F5 split into cardWeekFelt + cardRhythm; the shared style
    // is gone. The grep tolerates a comment or commentary mentioning
    // 'card:' but the actual style key must be absent.
    expect(STRIPPED).not.toMatch(/^\s*card:\s*\{/m);
  });

  it('cardHeader cream-strip retired (cross-tone orphan inside lane cards)', () => {
    // Pre-C the cardHeader carried a warm-cream rgba(255,235,205,0.025)
    // backgroundColor + youCardBorder bottom border, inherited from the
    // You-tab warm card pattern. Both read as cross-tone orphans inside
    // the now-lavender + neutral cards. F5 stripped the chrome; spacing
    // preserved.
    const block = styleBlock('cardHeader');
    expect(block).not.toBe('');
    expect(block).not.toMatch(/backgroundColor:/);
    expect(block).not.toMatch(/borderBottomWidth:/);
    expect(block).not.toMatch(/borderBottomColor:/);
    // Spacing preserved.
    expect(num(block, 'paddingTop')).toBe(11);
    expect(num(block, 'paddingBottom')).toBe(8);
  });

  it('rhythmCell: dark inset tile wrapper per spec 2.6 (stats scan as peers)', () => {
    const block = styleBlock('rhythmCell');
    expect(block).toMatch(/backgroundColor:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.18\)['"]/);
    expect(num(block, 'borderRadius')).toBe(7);
    expect(num(block, 'paddingVertical')).toBe(7);
    expect(num(block, 'paddingHorizontal')).toBe(4);
    expect(num(block, 'flex')).toBe(1);
  });

  it('nudgeCard: DE-FILLED (S7) — no gradient, neutral surface + sage border + sage left-rule', () => {
    const block = styleBlock('nudgeCard');
    expect(block).toMatch(/backgroundColor:\s*c\.surfaceAlt\b/);
    expect(block).toMatch(/borderColor:\s*c\.accentBorder\b/);
    expect(num(block, 'borderLeftWidth')).toBe(3);
    expect(block).toMatch(/borderLeftColor:\s*c\.accent\b(?!\w)/);
    expect(num(block, 'borderRadius')).toBe(11);
    expect(block).not.toMatch(/caregiverAccent/);
    // The lavender LinearGradient body is gone — the nudge reads via chrome, no fill.
    expect(STRIPPED).not.toMatch(/<LinearGradient/);
  });

  it('nudgePrimary CTA: sage `colors.accent` bg + near-black text (Phase 33b extension lavender no-fill canon — reframed from Phase 29 Batch C F5 lavender flip)', () => {
    // Phase 29 Batch C F5 had flipped this inline backgroundColor from
    // colors.accent (sage) → colors.caregiverAccent (lavender) for Tier-1
    // within-surface coherence (the entire subscreen reads caregiver-lane).
    // Phase 33b extension lavender no-fill canon (site #7) reversed that
    // flip — lavender is now restricted to eyebrow-scale text + thin
    // accents, never fills. "Try 2 minutes of breathing" is an
    // action-affirmative CTA (start a breathing exercise); sage is the
    // correct lane regardless of the surrounding caregiver-wellness
    // chrome. The nudgeCard's LinearGradient still carries the lavender
    // lane identity; the inner CTA now reads as a clear sage begin beat.
    expect(STRIPPED).toMatch(
      /style=\{\[styles\.nudgePrimary,\s*\{\s*backgroundColor:\s*colors\.accent\s*\}/,
    );
    // Text color (near-black) unchanged across the lane reframe — same
    // Phase 26 F4 sage/lavender-CTA contrast precedent applies on sage.
    const textBlock = styleBlock('nudgePrimaryText');
    expect(textBlock).toMatch(/color:\s*['"]#0a0c0a['"]/);
    expect(textBlock).not.toMatch(/color:\s*c\.textPrimary/);
  });
});

describe('Phase 29 Batch C F5 — Tier 1 sweep (lane-coherence absence pin)', () => {
  it('caregiver-wellness consumes bare `c.accent` / `colors.accent` (Phase 33b extension lavender no-fill canon — reframed from Phase 29 Batch C F5 absence pin)', () => {
    // Pre-cleanup this was a Tier-1 absence pin matching the BreathingExercise
    // lane-coherence pattern — caregiver-wellness was fully lavender-laned
    // with no sage tokens permitted. Phase 33b extension lavender no-fill
    // canon (sites #6 + #7) flipped two saturated lavender fills (rangeBtn
    // active state + nudgePrimary CTA) back to sage, since action-affirmative
    // is the correct lane for selectors + start-exercise CTAs regardless of
    // surrounding chrome. The absence pin is reframed as a presence pin to
    // catch silent regression to a third color (e.g., a hardcoded hex). The
    // subscreen's caregiver-lane identity now lives in the eyebrow + header +
    // card chrome, not in these controls.
    expect(STRIPPED).toMatch(/\b(c|colors)\.accent\b/);
  });

  it('Tier 1: noticedCallout + noticedEyebrow are SAGE (S7 de-purple)', () => {
    const callout = styleBlock('noticedCallout');
    const eyebrow = styleBlock('noticedEyebrow');
    expect(callout).toMatch(/borderLeftColor:\s*c\.accent\b(?!\w)/);
    expect(callout).not.toMatch(/caregiverAccent/);
    expect(eyebrow).toMatch(/color:\s*c\.accent\b(?!\w)/);
    expect(eyebrow).not.toMatch(/caregiverAccent/);
  });

  it('Tier 1: nudgeEyebrow color = sage accent (S7)', () => {
    const block = styleBlock('nudgeEyebrow');
    expect(block).toMatch(/color:\s*c\.accent\b(?!\w)/);
    expect(block).not.toMatch(/caregiverAccent/);
  });

  it('Tier 1: emptyCtaText color = sage accent (S7)', () => {
    const block = styleBlock('emptyCtaText');
    expect(block).toMatch(/color:\s*c\.accent\b(?!\w)/);
    expect(block).not.toMatch(/caregiverAccent/);
  });

  it('Tier 1: rhythmValue inline color (since-last-check-in line) = sage accent (S7)', () => {
    expect(STRIPPED).toMatch(
      /\[styles\.rhythmValue,\s*\{\s*color:\s*colors\.accent\s*\}\]/,
    );
  });

  it('Tier 1: range toggle selected state = sage `colors.accent` (Phase 33b extension lavender no-fill canon — reframed from Phase 29 Batch C F4 lavender flip)', () => {
    // Phase 29 Batch C F4 had flipped this selected state from sage to
    // lavender as a Tier-1 within-surface coherence move. Phase 33b
    // extension lavender no-fill canon (site #6) reversed that flip —
    // lavender is now restricted to eyebrow-scale text + thin accents,
    // never fills. The range toggle is a selection control —
    // action-affirmative is the correct lane regardless of surrounding
    // chrome. The subscreen's caregiver-lane identity now lives in the
    // eyebrow + header + card chrome.
    expect(STRIPPED).toMatch(
      /range === r && \{\s*backgroundColor:\s*colors\.accent\s*\}/,
    );
  });
});

describe('Phase 29 Batch C F3 — caregiver-wellness header revoice (reaffirmed)', () => {
  it('SubScreenHeader uses serif variant + sentence-case "Your wellness"', () => {
    expect(STRIPPED).toMatch(
      /<SubScreenHeader\s+title="Your wellness"\s+titleVariant="serif"\s*\/>/,
    );
    // Absence pin — pre-C capitalized title retired.
    expect(STRIPPED).not.toMatch(/title="Your Wellness"/);
  });
});
