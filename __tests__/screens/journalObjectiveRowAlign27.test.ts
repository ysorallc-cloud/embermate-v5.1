// ============================================================================
// Phase 27 Tuning 2 — Section 2 (Objective) row label vertical-align to top.
//
// HISTORY: Pre-F2 Section 2 used a horizontal label/value layout
// (80pt serif label column + flex-1 value column). Simulator regression
// on tall value columns (5 medications wrapped to multiple lines)
// rendered the label visually centered; the fix was `alignSelf:
// 'flex-start'` on `objectiveLabel` + `alignItems: 'flex-start'` on
// `objectiveRow`. This test pinned that fix.
//
// RETIRED by Phase 27 F2 (2026-05-21): the hybrid gutter restructure
// (Q-27.2c) collapsed the horizontal label/value row into a vertical
// `bucketGroup` (serif bucket header on its own line ABOVE the sub-
// rows). There is no longer a label column to vertically align — the
// concern this test guarded simply doesn't exist in the new layout.
//
// Reframed as absence pins per the established discipline (preserve
// test, flip assertions):
//   1. objectiveLabel style is RETIRED — its absence is the new pin.
//   2. objectiveRow style is RETIRED — same.
//
// If the horizontal layout ever returns (e.g., a future redesign
// reverses Q-27.2c), the absence pins flip back and the original
// alignment concern can resurface in a fresh test.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/journal.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

describe('Phase 27 Tuning 2 — RETIRED by F2 hybrid gutter restructure (absence pins)', () => {
  it('contract 1 (retired): objectiveLabel style key is gone from journal.tsx', () => {
    // The horizontal label column is retired. Absence of the style
    // declaration defends against a future contributor re-introducing
    // the old horizontal layout without re-evaluating the alignment
    // concern this test originally guarded.
    expect(SRC).not.toMatch(/^\s+objectiveLabel\s*:\s*\{/m);
  });

  it('contract 2 (retired): objectiveRow style key is gone from journal.tsx', () => {
    expect(SRC).not.toMatch(/^\s+objectiveRow\s*:\s*\{/m);
  });
});
