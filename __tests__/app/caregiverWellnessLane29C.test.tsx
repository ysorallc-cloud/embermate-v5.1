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
  it('cardWeekFelt: Tier 3 primary lane chrome (matches ReflectionCard + JournalSection)', () => {
    const block = styleBlock('cardWeekFelt');
    expect(block).not.toBe('');
    expect(block).toMatch(/backgroundColor:\s*c\.caregiverAccentBg\b/);
    expect(block).toMatch(/borderColor:\s*c\.caregiverAccentWash\b/);
    expect(num(block, 'borderWidth')).toBe(0.5);
    expect(num(block, 'borderLeftWidth')).toBe(3);
    // Full hex caregiverAccent — not an alpha variant (Q-C1 / Tier 3 rule).
    expect(block).toMatch(/borderLeftColor:\s*c\.caregiverAccent\b(?!\w)/);
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

  it('nudgeCard: LinearGradient wrapper + caregiverAccentStrong border + radius 11 (sage rgba retired)', () => {
    const block = styleBlock('nudgeCard');
    // backgroundColor moved to the LinearGradient stops; the style itself
    // owns border + radius + padding only.
    expect(block).not.toMatch(/backgroundColor:/);
    expect(block).toMatch(/borderColor:\s*c\.caregiverAccentStrong\b/);
    expect(num(block, 'borderRadius')).toBe(11);
    // JSX uses LinearGradient with caregiverAccentLight → caregiverAccentBg
    // stops (spec 2.7 — lavender 0.10 → 0.06 vertical).
    expect(STRIPPED).toMatch(
      /<LinearGradient[\s\S]*?colors=\{\[colors\.caregiverAccentLight,\s*colors\.caregiverAccentBg\]\}/,
    );
    // Absence pin — sage rgba retired from the nudge card block.
    expect(block).not.toMatch(/rgba\(95,\s*184,\s*138/);
  });

  it('nudgePrimary CTA: caregiverAccent bg + near-black text (dark on lavender, Phase 26 share CTA contrast tier)', () => {
    // Inline backgroundColor on the TouchableOpacity flips from
    // colors.accent (sage) → colors.caregiverAccent (lavender).
    expect(STRIPPED).toMatch(
      /style=\{\[styles\.nudgePrimary,\s*\{\s*backgroundColor:\s*colors\.caregiverAccent\s*\}/,
    );
    // Text color flips white → near-black for AAA contrast on lavender.
    const textBlock = styleBlock('nudgePrimaryText');
    expect(textBlock).toMatch(/color:\s*['"]#0a0c0a['"]/);
    expect(textBlock).not.toMatch(/color:\s*c\.textPrimary/);
  });
});

describe('Phase 29 Batch C F5 — Tier 1 sweep (lane-coherence absence pin)', () => {
  it('caregiver-wellness source contains no bare `c.accent` / `colors.accent` references', () => {
    // Same pattern as Batch A.2 BreathingExercise lane-coherence pin.
    // Stripped source skips changelog commentary that mentions the
    // pre-C sage tokens by name. Word boundary preserves suffixed
    // accent tokens (accentLight, accentBorder, etc.) as legal —
    // only the bare property access (sage solid) is forbidden.
    expect(STRIPPED).not.toMatch(/\b(c|colors)\.accent\b/);
  });

  it('Tier 1: noticedCallout + noticedEyebrow drop pre-C c.accent fallback', () => {
    // Pre-C both used `(c as any).caregiverAccent || c.accent` defensive
    // fallback. F5 dropped the fallback — caregiverAccent is a stable
    // dependency post-Phase-26 lane work.
    const callout = styleBlock('noticedCallout');
    const eyebrow = styleBlock('noticedEyebrow');
    expect(callout).toMatch(/borderLeftColor:\s*c\.caregiverAccent\b(?!\w)/);
    expect(callout).not.toMatch(/\|\|\s*c\.accent/);
    expect(eyebrow).toMatch(/color:\s*c\.caregiverAccent\b(?!\w)/);
    expect(eyebrow).not.toMatch(/\|\|\s*c\.accent/);
  });

  it('Tier 1: nudgeEyebrow color = caregiverAccent', () => {
    const block = styleBlock('nudgeEyebrow');
    expect(block).toMatch(/color:\s*c\.caregiverAccent\b(?!\w)/);
  });

  it('Tier 1: emptyCtaText color = caregiverAccent', () => {
    const block = styleBlock('emptyCtaText');
    expect(block).toMatch(/color:\s*c\.caregiverAccent\b(?!\w)/);
  });

  it('Tier 1: rhythmValue inline color (since-last-check-in line) = caregiverAccent', () => {
    // The first rhythm cell inlines `{ color: colors.caregiverAccent }`
    // on the rhythmValue Text. F5 changed this from colors.accent.
    expect(STRIPPED).toMatch(
      /\[styles\.rhythmValue,\s*\{\s*color:\s*colors\.caregiverAccent\s*\}\]/,
    );
  });

  it('Tier 1: range toggle selected state = caregiverAccent (F4 reaffirmed)', () => {
    // F4 swap pinned here too as part of the Batch C coherence pin —
    // the range toggle is part of the same Tier 1 sweep concern.
    expect(STRIPPED).toMatch(
      /range === r && \{\s*backgroundColor:\s*colors\.caregiverAccent\s*\}/,
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
