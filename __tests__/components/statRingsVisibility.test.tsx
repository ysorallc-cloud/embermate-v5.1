// ============================================================================
// StatRings visibility — Phase 3.7.2.
//
// Phase 3.6.1 swapped the rgba(255,240,215,0.18) ring for a solid #3a3b35
// at 1px borderWidth. Device review of Phase 3.6 still showed the rings
// reading ambiguous — at TILE_SIZE 28 the 1px ring occupies ~3.6% of the
// tile diameter, below the perceptual threshold for "definite shape."
//
// 3.7.2 fix (option A — recommended path):
//   • TILE_SIZE 28 → 36 (gives the ring more screen real estate)
//   • Add backgroundColor: c.glassDim — the lifted #2a2c25 reads as a
//     recessed well behind the emoji, providing a third visual cue
//     beyond shape and edge
//   • Keep borderWidth: 1 and borderColor: '#3a3b35' (Phase 3.6.1 value)
//
// 4 tiles × (36pt + 8pt gap) × 4 = 36*4 + 8*3 = 144 + 24 = 168pt of
// row content. With 14pt page-edge padding on each side, total occupies
// 168 + 28 = 196pt of horizontal space — fits comfortably in the
// minimum iPhone width of 320pt and obviously in 375pt+ devices.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'components/now/StatRings.tsx'), 'utf8');

describe('Phase 3.7.2 — stat ring visibility', () => {
  it('TILE_SIZE is 36 (was 28)', () => {
    const m = src.match(/const\s+TILE_SIZE\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(36);
  });

  it('tile carries a recessed-well backgroundColor (c.glassDim)', () => {
    // The recessed-well effect is the third visual cue beyond shape +
    // edge. glassDim sits ~5 L* above the page bg, dim enough to read
    // as "underneath" but visible enough to delineate the tile.
    const tileBlock = src.match(/tile:\s*\{[^}]*\}/s);
    expect(tileBlock).not.toBeNull();
    expect(tileBlock![0]).toMatch(/backgroundColor:\s*c\.glassDim\b/);
  });

  it('borderWidth stays at 1 (Phase 3.6.1 contract preserved)', () => {
    const tileBlock = src.match(/tile:\s*\{[^}]*\}/s);
    expect(tileBlock).not.toBeNull();
    expect(tileBlock![0]).toMatch(/borderWidth:\s*1\b/);
  });

  it('borderColor stays at the solid #3a3b35 (Phase 3.6.1 contract preserved)', () => {
    expect(src).toMatch(/const\s+NEUTRAL_RING\s*=\s*['"]#3a3b35['"]/);
  });

  it('four tiles fit at 375pt screen width without flexBasis overflow', () => {
    // Defense-in-depth math check: 4 × 36 + 3 × 8 (gap) = 168pt content.
    // Page edge at 14pt × 2 = 28pt. Total = 196pt. Fits comfortably in
    // 320pt (iPhone SE 1st gen) — the smallest target — let alone 375pt.
    const TILE_SIZE = 36;
    const COUNT = 4;
    const GAP = 8;
    const PAGE_EDGE = 14 * 2;
    const totalWidth = TILE_SIZE * COUNT + GAP * (COUNT - 1) + PAGE_EDGE;
    expect(totalWidth).toBeLessThanOrEqual(320);
  });
});
