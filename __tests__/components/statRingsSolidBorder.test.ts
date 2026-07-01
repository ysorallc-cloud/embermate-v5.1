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
  it('the ring border uses the neutral border TOKEN, not a hardcoded literal', () => {
    // Now rebuild step 4 — the #3a3b35 ring literal + its per-category
    // RING_COLOR map migrated to the c.border token at the tile. Solid, crisp
    // (no rgba alpha), now theme-driven.
    expect(src).toMatch(/borderColor:\s*colors\.border\b/);
    expect(src).not.toMatch(/#3a3b35/);
    expect(src).not.toMatch(/NEUTRAL_RING/);
  });

  it('all category tiles share the ONE neutral token (unified row, no per-category map)', () => {
    expect(src).not.toMatch(/RING_COLOR/);
    expect((src.match(/borderColor:\s*colors\.border\b/g) || []).length).toBeGreaterThanOrEqual(1);
  });

  it('tile borderWidth is 1 (was 0.5 — crisper definition)', () => {
    const m = src.match(/tile:\s*\{[^}]*borderWidth:\s*(\d+(?:\.\d+)?)/s);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(1);
  });
});
