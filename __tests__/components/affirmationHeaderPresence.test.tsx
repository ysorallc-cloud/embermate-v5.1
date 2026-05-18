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

describe('Phase 7.1 — affirmation header presence bump', () => {
  const text = styleBlock('text');

  it('fontSize bumps to 18pt', () => {
    expect(num(text, 'fontSize')).toBe(18);
  });

  it('lineHeight bumps to 30pt (≈ 1.65 × 18)', () => {
    expect(num(text, 'lineHeight')).toBe(30);
  });

  it('color resolves through the youAffirmationText token (preserves the override pattern)', () => {
    // The token-or-fallback pattern must survive the bump — this is how
    // a future warmer cream tint can land without touching the component.
    expect(text).toMatch(/youAffirmationText[\s\S]{0,40}\|\|[\s\S]{0,40}c\.textPrimary/);
  });

  it('still serif italic (Fonts.serifItalic + italic, post-Phase-33 F7)', () => {
    // Phase 33 F7 — Georgia literal swept to Fonts.serifItalic token.
    expect(text).toMatch(/fontFamily:\s*Fonts\.serifItalic\b/);
    expect(text).toMatch(/fontStyle:\s*['"]italic['"]/);
  });

  it('maxWidth widens to 320pt to avoid orphan lines at the larger size', () => {
    const m = num(text, 'maxWidth');
    expect(m).toBe(320);
  });
});
