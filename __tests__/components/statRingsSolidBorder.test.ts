// ============================================================================
// StatRings — solid ring borders (Phase 3.6.1).
//
// Device review of Phase 3.5 showed the stat tile rings reading too faint
// against the lifted warm-charcoal page bg. The rings used
// `rgba(255, 240, 215, 0.18)` — 18% opacity which dropped below
// "deliberate UI element" perception once the page lifted to #1f201c.
//
// 3.6.1 fix: replace the alpha-on-dark ring with a solid `#3a3b35` —
// approximately L* 3 above the page bg, crisp 1px edge that reads as
// deliberate without shouting. borderWidth lifts 0.5 → 1.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'components/now/StatRings.tsx'), 'utf8');

describe('Phase 3.6.1 — StatRings solid ring borders', () => {
  it('NEUTRAL_RING is the solid #3a3b35, not an rgba alpha', () => {
    const m = src.match(/const NEUTRAL_RING\s*=\s*['"]([^'"]+)['"]/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('#3a3b35');
    expect(m![1]).not.toMatch(/rgba/i);
  });

  it('all four category rings use the NEUTRAL_RING constant (no alpha)', () => {
    // RING_COLOR maps the four categories to NEUTRAL_RING. The block must
    // contain meds/vitals/wellness/meals each pointing at NEUTRAL_RING,
    // and must NOT contain any rgba reference.
    const blockMatch = src.match(/RING_COLOR[^=]*=\s*\{([^}]+)\}/s);
    expect(blockMatch).not.toBeNull();
    const block = blockMatch![1];
    for (const key of ['meds', 'vitals', 'wellness', 'meals']) {
      expect(block).toMatch(new RegExp(`${key}:\\s*NEUTRAL_RING`));
    }
    expect(block).not.toMatch(/rgba/i);
  });

  it('tile borderWidth is 1 (was 0.5 — crisper definition)', () => {
    const m = src.match(/tile:\s*\{[^}]*borderWidth:\s*(\d+(?:\.\d+)?)/s);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(1);
  });
});
