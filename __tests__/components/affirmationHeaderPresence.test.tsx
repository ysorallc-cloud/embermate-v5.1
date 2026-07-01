// ============================================================================
// Phase 7.1 — Affirmation header typography upgrade.
//
// The affirmation line carries the You tab's emotional thesis. Before
// Phase 7 it sat at subtitle weight (13.5pt). Bump to 18pt serif italic
// with 30pt line-height so its presence matches its emotional weight,
// without changing the voice (still serif italic, warm cream).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/support/AffirmationHeader.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}
function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Affirmation header — reflect line (You rebuild S4)', () => {
  const text = styleBlock('text');
  const container = styleBlock('container');

  it('fontSize is 16pt (reflect line)', () => {
    expect(num(text, 'fontSize')).toBe(16);
  });

  it('lineHeight is 26pt (≈ 1.6 × 16)', () => {
    expect(num(text, 'lineHeight')).toBe(26);
  });

  it('color resolves through the youAffirmationText token (preserves the override pattern)', () => {
    // The token-or-fallback pattern must survive — this is how a future
    // warmer cream tint can land without touching the component.
    expect(text).toMatch(/youAffirmationText[\s\S]{0,40}\|\|[\s\S]{0,40}c\.textPrimary/);
  });

  it('still serif italic (Fonts.serifItalic + italic)', () => {
    expect(text).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
    expect(text).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('is a left-ruled reflect line — SAGE border-left, no width cap', () => {
    // Left-aligned open note with a sage rule (§5 blue-never-on-You),
    // not the old centered narrow column.
    expect(num(text, 'maxWidth')).toBeNull();
    expect(text).toMatch(/textAlign:\s*['"]left['"]/);
    expect(container).toMatch(/borderLeftColor:\s*c\.accent(?:Muted|Light)?\b/);
  });
});
