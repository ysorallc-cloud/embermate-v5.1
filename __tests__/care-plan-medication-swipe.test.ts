// ============================================================================
// Care Plan medication swipe-to-delete — Phase 2.6.4.
//
// Device review showed the swipe-to-delete background bleeding bright red
// across the entire row — including under the toggle on the right edge —
// before any swipe gesture. The container layout is fine: a fixed-width
// 96pt action zone is absolutely-positioned behind the row, and the row
// translates left to reveal it on swipe. The bleed comes from the
// foreground row's `backgroundColor: c.glassFaint` — `rgba(255, 245, 220,
// 0.03)`, nearly transparent — letting the red action show through.
//
// Phase 2.6.4 fix:
//   1. Make the foreground row opaque (`c.glass` — the Phase 0 lifted
//      card surface #363830). With the row opaque, the absolutely-
//      positioned action behind it stays hidden until swipe.
//   2. Route the action background through `c.criticalAlert` (the
//      semantic name for the same #e6776e value already used via
//      `c.red`) so the color budget audit reads cleanly.
//   3. Tighten the action zone width to 80pt — matches the spec's
//      target tap-target size and slightly less of the row gets revealed.
//
// Source-level audit pins all three. The mount-based test would require
// stubbing PanResponder + Animated.View + the medication-form + repo
// modules — a heavier setup than the contract warrants.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'app/care-plan/meds.tsx'), 'utf8');

describe('Phase 2.6.4 — medication swipe action contained', () => {
  it('foreground swipeable row uses an opaque card surface (c.glass)', () => {
    // The row that translates on swipe must be opaque so it covers the
    // delete action behind it in the closed state.
    expect(src).toMatch(/medItemSwipeable:\s*\{[^}]*backgroundColor:\s*c\.glass\b/s);
  });

  it('removeAction background routes through criticalAlert (not c.red alias)', () => {
    // The criticalAlert semantic name keeps the color-budget audit (Phase 7)
    // reading cleanly. Same hex value (#e6776e) — different alias.
    expect(src).toMatch(/removeAction:\s*\{[^}]*backgroundColor:\s*c\.criticalAlert\b/s);
    expect(src).not.toMatch(/removeAction:\s*\{[^}]*backgroundColor:\s*c\.red\b/s);
  });

  it('REMOVE_ACTION_WIDTH constrains to a fixed 80pt action zone', () => {
    // Tap-target shape — not flex, not unbounded.
    expect(src).toMatch(/REMOVE_ACTION_WIDTH\s*=\s*80\b/);
  });

  it('removeAction style declares the matching fixed width', () => {
    expect(src).toMatch(/removeAction:\s*\{[^}]*width:\s*80\b/s);
  });

  it('removeAction stays absolutely-positioned (revealed only on swipe)', () => {
    // The action must NOT be inline in the row's flex flow — that would
    // make it visible in the initial closed state.
    expect(src).toMatch(/removeAction:\s*\{[^}]*position:\s*['"]absolute['"]/s);
  });
});
