// ============================================================================
// spacingRhythm33 — Phase 33 spacing-rhythm contract.
//
// Pins the F10 spacing-fixup targets so the rhythm decisions don't drift.
// Five source pins across three files:
//
//   • app/(tabs)/now.tsx     sectionCard.marginBottom        = Spacing.s4
//   • app/(tabs)/now.tsx     sectionHeaderRow.paddingTop     = 12
//   • app/(tabs)/now.tsx     sectionHeaderRow.paddingBottom  = 6
//   • app/(tabs)/understand.tsx  section.marginBottom        = Spacing.s4
//   • app/visit-prep.tsx     all paddingHorizontal sites     = 14
//
// EXCLUDED from this contract (Phase 33b carve-out):
//   • Now / You greeting-block spacing — Phase 33b Scope 1 greeting+
//     subhead architecture will re-establish the rhythm; pinning the
//     current state would create a contract 33b immediately violates.
//
// EXCLUDED (Q-33.3 deferred backlog):
//   • Wider eyebrow rhythm across the 108 inline eyebrow-shaped
//     patterns — Phase 33b Lock 4 handles that.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const nowSrc = read('app/(tabs)/now.tsx');
const understandSrc = read('app/(tabs)/understand.tsx');
const visitPrepSrc = read('app/visit-prep.tsx');

function styleBlock(src: string, name: string): string {
  // Brace-counter walk for nested objects.
  const opener = src.indexOf(`${name}: {`);
  if (opener < 0) return '';
  const start = opener + name.length + 3;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src.slice(start, i - 1);
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

// ── Target 1: Now sectionCard.marginBottom = Spacing.s4 ──────────────────

describe('spacingRhythm33 — Target 1: Now sectionCard.marginBottom (F10 Spacing.s4 precedent)', () => {
  it('Now sectionCard.marginBottom routes through Spacing.s4 (= 16) token, not a literal pixel value', () => {
    // First deliberate consumer of the s1–s12 numeric scale F2 introduced.
    // Token-routed: if the canon shifts, this site cascades automatically.
    const block = styleBlock(nowSrc, 'sectionCard');
    expect(block).not.toBe('');
    expect(block).toMatch(/marginBottom:\s*Spacing\.s4\b/);
  });
});

// ── Target 2: Insights section.marginBottom = Spacing.s4 ─────────────────

describe('spacingRhythm33 — Target 2: Insights section.marginBottom (F10 Q-F10.4 audit-stale fix)', () => {
  it('Insights `section` wrapper.marginBottom routes through Spacing.s4', () => {
    // Pre-F10 the value was 4 — below the Surface 3 16pt minimum.
    // F10 bumped to Spacing.s4 (16). The audit doc's described property
    // (`marginVertical: Spacing.sm`) didn't exist at execution-time
    // (refactor-drift); fix applied to the closest semantically-
    // equivalent current property.
    const block = styleBlock(understandSrc, 'section');
    expect(block).not.toBe('');
    expect(block).toMatch(/marginBottom:\s*Spacing\.s4\b/);
  });
});

// ── Target 3: Now sectionHeaderRow eyebrow positioning (F10 inversion) ───

describe('spacingRhythm33 — Target 3: Now sectionHeaderRow eyebrow positioning (F10 inversion)', () => {
  it('paddingTop is 12 (more breathing above — eyebrow separates from preceding content)', () => {
    const block = styleBlock(nowSrc, 'sectionHeaderRow');
    expect(block).not.toBe('');
    expect(num(block, 'paddingTop')).toBe(12);
  });

  it('paddingBottom is 6 (less breathing below — eyebrow tight to following content per "eyebrow belongs to what follows" convention)', () => {
    const block = styleBlock(nowSrc, 'sectionHeaderRow');
    expect(num(block, 'paddingBottom')).toBe(6);
  });

  it('paddingTop > paddingBottom (the inversion invariant — defends against future drift back to the pre-F10 8/10 state)', () => {
    const block = styleBlock(nowSrc, 'sectionHeaderRow');
    const top = num(block, 'paddingTop');
    const bottom = num(block, 'paddingBottom');
    expect(top).not.toBeNull();
    expect(bottom).not.toBeNull();
    expect(top as number).toBeGreaterThan(bottom as number);
  });
});

// ── Target 4: Visit-prep paddingHorizontal unification at 14 ─────────────

describe('spacingRhythm33 — Target 4: Visit-prep paddingHorizontal unified at 14', () => {
  it('every paddingHorizontal value in visit-prep is 14 (unified page-edge rhythm)', () => {
    // Pre-F10 had a mix of 12 / 16 / 14 / 14 — uneven. F10 unified the
    // 12 and the 16 to 14. The contract: every paddingHorizontal must
    // be 14 across the page.
    const matches = visitPrepSrc.match(/paddingHorizontal:\s*(\d+)/g) ?? [];
    const values = matches.map((m) => Number(m.replace(/[^\d]/g, '')));
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(v).toBe(14);
    }
  });
});
