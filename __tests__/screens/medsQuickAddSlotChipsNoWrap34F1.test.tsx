// ============================================================================
// Phase 34 F1 follow-up — quick-add time-slot chips must render single-line.
//
// STOP-walk report (2026-05-26): F1 renamed "Midday" → "Afternoon" on
// the meds quick-add time-slot row. The chips were sized for the old
// short label; "Afternoon" (9 chars) wraps to two lines at the fixed
// flex-1 width, breaking the row height.
//
// FIX (visual-only, no logic change): every chip Text gets
// `numberOfLines={1}` (locks single-line) AND `adjustsFontSizeToFit`
// (iOS auto-shrinks the label per chip if it would overflow, so only
// "Afternoon" shrinks while "Morning" / "Evening" / "Night" keep
// their full 11pt). No truncation; all four chips stay equal-height
// because the container's height is driven by the chip's
// paddingVertical, not the label's intrinsic line count.
//
// User-locked alternatives in the brief were: shrink horizontal
// padding, reduce font globally, OR numberOfLines+adjusts. Going
// with the latter — narrowest visual change (only the overflow case
// shrinks), most robust to any future label rename.
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

describe('Phase 34 F1 follow-up — quick-add time-slot chips render single-line (no wrap)', () => {
  // --------------------------------------------------------------------------
  // The chip label render — source-level pins on the chip Text node.
  // --------------------------------------------------------------------------

  it('contract 1: the QUICK_ADD time-slot chip Text node sets numberOfLines={1}', () => {
    // Scope-anchored on the QUICK_ADD_TIME_SLOTS.map(...) block.
    // The chip render lives inside it; a stray numberOfLines={1}
    // elsewhere in the file (e.g. the med-row instructions Text at
    // line 231) shouldn't satisfy this contract.
    const mapIdx = STRIPPED.search(/QUICK_ADD_TIME_SLOTS\.map\s*\(/);
    expect(mapIdx).toBeGreaterThan(-1);
    // Window of 800 chars after the .map( opens — captures the
    // inner TouchableOpacity + the Text + its props + the closing
    // tags. The chip label is the only Text node inside this block.
    // 1200-char window — the chip render block contains
    // multi-line accessibility props + a style array + an inline
    // JSX comment that strip-leaves blank lines. 800 didn't reach
    // numberOfLines / adjustsFontSizeToFit; 1200 captures through
    // the closing </Text>.
    const window = STRIPPED.slice(mapIdx, Math.min(STRIPPED.length, mapIdx + 1200));
    expect(window).toMatch(/numberOfLines\s*=\s*\{?\s*1\s*\}?/);
  });

  it('contract 2: the QUICK_ADD time-slot chip Text node enables adjustsFontSizeToFit (iOS auto-shrink for "Afternoon")', () => {
    // Pin the auto-shrink behavior — pairs with numberOfLines={1}
    // so the label collapses font-size in-place rather than
    // truncating with an ellipsis. Locked in source so a future
    // refactor that drops adjustsFontSizeToFit (and re-introduces
    // wrap or ellipsis) trips this contract.
    const mapIdx = STRIPPED.search(/QUICK_ADD_TIME_SLOTS\.map\s*\(/);
    expect(mapIdx).toBeGreaterThan(-1);
    // 1200-char window — the chip render block contains
    // multi-line accessibility props + a style array + an inline
    // JSX comment that strip-leaves blank lines. 800 didn't reach
    // numberOfLines / adjustsFontSizeToFit; 1200 captures through
    // the closing </Text>.
    const window = STRIPPED.slice(mapIdx, Math.min(STRIPPED.length, mapIdx + 1200));
    expect(window).toMatch(/adjustsFontSizeToFit/);
  });

  // --------------------------------------------------------------------------
  // Labels remain unchanged — F1's "Afternoon" rename is preserved; the
  // fix lives in render props, not label text.
  // --------------------------------------------------------------------------

  it('contract 3: QUICK_ADD_TIME_SLOTS labels still read Morning / Afternoon / Evening / Night (F1 rename preserved)', () => {
    // Pin the labels so a "let's just rename Afternoon back to Mid
    // to dodge the wrap" regression gets caught here. The fix is
    // VISUAL — labels stay user-facing-canonical.
    expect(STRIPPED).toMatch(/value\s*:\s*['"]morning['"]\s*,\s*label\s*:\s*['"]Morning['"]/);
    expect(STRIPPED).toMatch(/value\s*:\s*['"]midday['"]\s*,\s*label\s*:\s*['"]Afternoon['"]/);
    expect(STRIPPED).toMatch(/value\s*:\s*['"]evening['"]\s*,\s*label\s*:\s*['"]Evening['"]/);
    expect(STRIPPED).toMatch(/value\s*:\s*['"]night['"]\s*,\s*label\s*:\s*['"]Night['"]/);
  });

  it('contract 4: all four chips remain equal-width via flex: 1 on quickAddSlot (no per-chip width override)', () => {
    // Equal-height + equal-width is what keeps the row reading as
    // one segmented control. Pre-fix this was already true via
    // flex: 1 on quickAddSlot; pin it so a "make Afternoon wider"
    // hotfix doesn't sneak in instead.
    const m = STRIPPED.match(/quickAddSlot\s*:\s*\{([^}]+)\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/flex\s*:\s*1\b/);
    // No width override on the selected variant either.
    const sel = STRIPPED.match(/quickAddSlotSelected\s*:\s*\{([^}]+)\}/);
    expect(sel).not.toBeNull();
    expect(sel![1]).not.toMatch(/\bwidth\s*:/);
  });
});
