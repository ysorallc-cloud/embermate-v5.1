// ============================================================================
// Phase 34 F1 follow-up³ — quick-add chips wrap to a 2x2 grid.
//
// STOP-walk #3 (2026-05-26):
//   "Afternoon STILL wraps. Four chips at fixed 1/4-width can't fit
//    'Afternoon' reliably on any device. The word is the constraint
//    and we're not shortening it. FIX — let the chips wrap to a 2x2
//    grid (flexWrap, each chip sized to its content with comfortable
//    padding, equal height). Four words, two rows, full font, no
//    shrink, no truncation."
//
// The user was right on every iteration. Capturing the full lesson
// here so the next maintainer reading this file sees the failure
// pattern explicitly:
//
//   • Attempt 1 — numberOfLines={1} + adjustsFontSizeToFit. GREEN
//     test (prop scan), WRAPPED on device (adjusts… unreliable in
//     flex-width containers).
//   • Attempt 2 — fontSize 11→10 to fit in flex:1. GREEN test
//     (style scan), WRAPPED on device (1/4-width too narrow on
//     real device widths regardless of font).
//   • Attempt 3 (this) — break out of the 4-in-a-row cram. Row
//     wraps; chips size to content + comfortable padding. The
//     LAYOUT accommodates the content instead of forcing the
//     content to fit the layout.
//
// ASSERTION CLASS — what this test CAN prove vs CAN'T:
//
//   CAN (source-level pins):
//     • The row container uses flexWrap.
//     • Chips are NOT flex:1 (no fixed-width-share cram).
//     • Chips have horizontal padding (comfortable, not crammed).
//     • The font is at full size (11pt), uniform across all chips.
//     • adjustsFontSizeToFit is absent (no per-chip shrink hack).
//     • numberOfLines={1} stays as a hard wrap-floor for any
//       future overflow surprise.
//
//   CANNOT (walk-only):
//     • That a real device actually renders each chip on one row
//       at full font with no mid-word wrap and no truncation.
//       The iOS text-layout engine that decides per-chip wrap
//       does NOT run in Jest. Three prior green test runs with
//       failing on-device renders made this lesson concrete.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(SRC);

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{([^}]+)\\}`);
  const m = src.match(re);
  return m ? m[1] : '';
}

describe('Phase 34 F1 follow-up³ — quick-add chips wrap to a 2x2 grid', () => {
  // --------------------------------------------------------------------------
  // ROW LAYOUT — flexWrap is the structural pivot from 4-in-a-row.
  // --------------------------------------------------------------------------

  it('contract 1: quickAddSlotRow uses flexWrap (chips wrap to additional rows when content overflows)', () => {
    const row = styleBlock(STRIPPED, 'quickAddSlotRow');
    expect(row).not.toBe('');
    expect(row).toMatch(/flexWrap\s*:\s*['"]wrap['"]/);
    // The row stays flexDirection: row so wrap produces an actual
    // grid (chips on the next row, not stacked vertically).
    expect(row).toMatch(/flexDirection\s*:\s*['"]row['"]/);
  });

  // --------------------------------------------------------------------------
  // CHIP SIZE — content-sized + comfortable padding, NOT flex:1.
  // --------------------------------------------------------------------------

  it('contract 2: quickAddSlot is NO LONGER flex:1 (chips size to their content, not a forced 1/4 row share)', () => {
    const slot = styleBlock(STRIPPED, 'quickAddSlot');
    expect(slot).not.toBe('');
    // Hard reject of the pre-fix forced-equal-width behavior.
    expect(slot).not.toMatch(/\bflex\s*:\s*1\b/);
  });

  it('contract 3: quickAddSlot has horizontal padding (comfortable, ≥12pt — not crammed)', () => {
    const slot = styleBlock(STRIPPED, 'quickAddSlot');
    expect(slot).not.toBe('');
    const m = slot.match(/paddingHorizontal\s*:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(12);
  });

  it('contract 4: quickAddSlot retains paddingVertical so all chips share the same height regardless of row', () => {
    // Heights must match whether the chip lands on row 1 or row 2
    // of the 2x2 grid. paddingVertical (uniform) + same fontSize
    // (uniform) drives that.
    const slot = styleBlock(STRIPPED, 'quickAddSlot');
    expect(slot).toMatch(/paddingVertical\s*:\s*\d+/);
  });

  // --------------------------------------------------------------------------
  // FONT — full size, uniform, no per-chip override.
  // --------------------------------------------------------------------------

  it('contract 5: quickAddSlotLabel font is at the FULL 11pt size (no shrink hack); uniform across all chips', () => {
    const label = styleBlock(STRIPPED, 'quickAddSlotLabel');
    expect(label).not.toBe('');
    expect(label).toMatch(/fontSize\s*:\s*11\b/);
    // Hard reject of the prior shrink-to-10 attempt.
    expect(label).not.toMatch(/fontSize\s*:\s*10\b/);
    // No per-chip override on the selected variant either.
    const selLabel = styleBlock(STRIPPED, 'quickAddSlotLabelSelected');
    expect(selLabel).not.toMatch(/fontSize\s*:/);
  });

  it('contract 6: the QUICK_ADD chip Text node does NOT use adjustsFontSizeToFit (no per-chip shrink hack)', () => {
    const mapIdx = STRIPPED.search(/QUICK_ADD_TIME_SLOTS\.map\s*\(/);
    expect(mapIdx).toBeGreaterThan(-1);
    const window = STRIPPED.slice(mapIdx, Math.min(STRIPPED.length, mapIdx + 1200));
    expect(window).not.toMatch(/adjustsFontSizeToFit/);
  });

  it('contract 7: numberOfLines={1} stays as a hard wrap-floor (defense for any future label that overflows a chip)', () => {
    // With content-sized chips and the current 4 labels at 11pt
    // (longest is "Afternoon", 9 chars), mid-word wrap can't
    // happen because the chip auto-sizes to its label. This prop
    // is belt-and-suspenders for any future label that grows past
    // the container's row capacity — RN can never render two lines
    // here.
    const mapIdx = STRIPPED.search(/QUICK_ADD_TIME_SLOTS\.map\s*\(/);
    expect(mapIdx).toBeGreaterThan(-1);
    const window = STRIPPED.slice(mapIdx, Math.min(STRIPPED.length, mapIdx + 1200));
    expect(window).toMatch(/numberOfLines\s*=\s*\{?\s*1\s*\}?/);
  });

  // --------------------------------------------------------------------------
  // WALK-ONLY DOCUMENTATION CONTRACT.
  //
  // This contract intentionally does NOT prove on-device wrap behavior.
  // Its job is to pin the FILE's own statement of that limitation so a
  // future maintainer can't silently delete the "this is walk-only"
  // breadcrumb. Three iterations of green test + broken device shipped
  // because the gap between source-pinnable and device-truth wasn't
  // visible. It is now.
  // --------------------------------------------------------------------------

  it('contract 8 (WALK-ONLY): the drawer source carries a walk-only note explaining what the test does NOT cover', () => {
    // The drawer's quickAddSlotRow style block comment names the
    // walk-only verification explicitly. Pin its presence so the
    // breadcrumb survives future maintenance.
    expect(SRC).toMatch(/WALK-ONLY\s+VERIFIED|walk-only verified|walk-only|walk gate|WALK-VERIFIED/);
  });
});
