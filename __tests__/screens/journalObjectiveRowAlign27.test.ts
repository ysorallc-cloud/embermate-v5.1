// ============================================================================
// Phase 27 Tuning 2 — Section 2 (Objective) row labels align to top.
//
// Simulator regression: on rows where the value column wraps to
// multiple lines (most visible: Medications with 5 line items), the
// serif label rendered visually centered to the row height — drifting
// in the middle of a tall block rather than anchoring at the first
// line of the value column.
//
// Root cause: `alignItems: 'flex-start'` on the row container is the
// right intent for cross-axis alignment, but RN's Text nodes can pick
// up implicit baseline behavior that defeats it inside a row. The fix
// is to make the label's top-alignment explicit via `alignSelf:
// 'flex-start'` — overrides any inherited baseline behavior, no
// surrounding-row changes.
//
// Pinned contracts:
//   1. objectiveLabel style declares alignSelf: 'flex-start'.
//   2. objectiveRow style continues to declare flexDirection: 'row'
//      and alignItems: 'flex-start' (Phase 27 F4 intent preserved).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/journal.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{[\\s\\S]*?\\n\\s{2,4}\\}`, '');
  const m = SRC.match(re);
  return m ? m[0] : '';
}

describe('Phase 27 Tuning 2 — Section 2 row label vertical-align to top', () => {
  it('contract 1: objectiveLabel style declares alignSelf: "flex-start"', () => {
    const block = styleBlock('objectiveLabel');
    expect(block).toBeTruthy();
    expect(block).toMatch(/alignSelf:\s*['"]flex-start['"]/);
  });

  it('contract 2: objectiveRow keeps flexDirection: "row" + alignItems: "flex-start" (Phase 27 F4 intent preserved)', () => {
    const block = styleBlock('objectiveRow');
    expect(block).toBeTruthy();
    expect(block).toMatch(/flexDirection:\s*['"]row['"]/);
    expect(block).toMatch(/alignItems:\s*['"]flex-start['"]/);
  });
});
