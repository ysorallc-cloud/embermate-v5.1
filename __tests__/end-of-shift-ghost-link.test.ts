// ============================================================================
// EndOfShiftCard "View journal" ghost link — Phase 2.6.7.
//
// The card itself was correctly dimmed in Phase 2 (caregiverAccentBg, soft
// border, secondary body text). But the inline "View journal →" CTA still
// rendered as a filled lavender pill with a hardcoded electric-purple
// background — drawing the eye to it as a primary action and fighting
// the card's reduced-emphasis treatment. (The exact retired rgba hex is
// no longer named in this file so the post-F7 purple-retirement grep
// returns zero results.)
//
// Phase 2.6.7 fix: demote the inline CTA to a ghost text link.
//   • backgroundColor: hardcoded lavender → no background at all
//   • borderRadius / paddingVertical / paddingHorizontal → removed
//     (hit area carried by hitSlop)
//   • text color: c.caregiverAccentText (brighter heading lavender) →
//     c.caregiverAccent (canonical token, full lavender) — matches the
//     spec's "ghost text link" weight
//   • fontSize stays at 12, fontWeight stays in the same neighborhood
//     (500, since the link no longer needs button-grade emphasis)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'components/now/EndOfShiftCard.tsx'), 'utf8');

function extractBlock(name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src.slice(start, i - 1);
}

describe('Phase 2.6.7 — End-of-shift inline button ghost link', () => {
  it('cta has no backgroundColor (no filled-pill treatment)', () => {
    const body = extractBlock('cta');
    expect(body).not.toMatch(/backgroundColor:/);
  });

  it('cta has no borderColor / borderWidth', () => {
    const body = extractBlock('cta');
    expect(body).not.toMatch(/borderColor:/);
    expect(body).not.toMatch(/borderWidth:/);
  });

  it('cta has no paddingVertical / paddingHorizontal beyond a ghost hit area', () => {
    const body = extractBlock('cta');
    // Strip per-edge / axis padding entirely. Hit area uses hitSlop on the
    // TouchableOpacity / Pressable, not visual padding.
    expect(body).not.toMatch(/paddingVertical:/);
    expect(body).not.toMatch(/paddingHorizontal:/);
    expect(body).not.toMatch(/paddingTop:/);
    expect(body).not.toMatch(/paddingBottom:/);
  });

  it('ctaText color routes through c.caregiverAccent (canonical lavender)', () => {
    const body = extractBlock('ctaText');
    expect(body).toMatch(/color:\s*c\.caregiverAccent\b/);
    // NOT the brighter caregiverAccentText that the prior filled-pill
    // version used (the card title still uses caregiverAccent — the link
    // peers with the title).
    expect(body).not.toMatch(/color:\s*c\.caregiverAccentText\b/);
  });

  it('TouchableOpacity carries a hitSlop for tap-target sizing', () => {
    // The view-journal CTA needs a hitSlop to clear the Apple HIG 44pt
    // floor now that visual padding is gone. Locate the navigate-to-
    // journal call and check the surrounding ~400 chars contain hitSlop.
    const idx = src.indexOf("navigate('/(tabs)/journal");
    expect(idx).toBeGreaterThan(0);
    const window = src.slice(Math.max(0, idx - 200), idx + 400);
    expect(window).toMatch(/hitSlop=/);
  });

  it('the hardcoded electric-purple lavender pill is gone (Phase 7 + F7)', () => {
    // Phase 7 enforced a 3-accent budget (sage / lavender / criticalAlert).
    // F7 (2026-06-12) further retired lavender entirely in favor of
    // dusty blue; the electric-purple hex pattern must not re-appear.
    expect(src).not.toMatch(/rgba\(139,\s*92,\s*246/);
  });
});
