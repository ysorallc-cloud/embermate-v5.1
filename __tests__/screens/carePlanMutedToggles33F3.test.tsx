// ============================================================================
// Phase 33 F3 — Care Plan toggle Switch goes muted (calmer ON state).
//
// User-locked (2026-05-26):
//   • ON track   → c.accentMuted (rgba(95,184,138,0.50)) — same sage as
//                  c.accent (#5fb88a) at 50% alpha. Half intensity:
//                  clearly ON, clearly sage, no longer shouting.
//   • ON thumb   → unchanged: c.textPrimary (#f4ddb8 cream). Cream-on-
//                  muted-sage holds the on-state signal; muting the
//                  thumb too would erode the ON/OFF distinction.
//   • OFF track  → unchanged: c.glassStrong (rgba(255,240,215,0.18)).
//                  Already the receded cream-muted treatment ("recede
//                  like current Vitals/Appointments").
//   • OFF thumb  → unchanged: c.switchThumbOff (#F4F3F4 system off-white).
//   • iOS bg     → unchanged: c.glassStrong (matches OFF track at rail).
//
// Render sites — CategoryRow in app/care-plan/index.tsx + the per-window
// rows in WellnessWindowsDrawer. The meds header has NO Switch (it uses
// caret + Edit toggle per 32A.1 F8).
//
// WELLNESS-MERGE F3 POLISH — the muted palette is EXTRACTED into the
// shared components/common/ThemedSwitch so it can't drift back to
// saturated/iOS-green. CategoryRow now renders <ThemedSwitch>; the four
// color decisions below are pinned against ThemedSwitch's source (their
// single home), and contract 7 pins CategoryRow's unchanged binding to
// the shared component.
//
// Behavior LOCK: the toggle's onValueChange handler and the
// `value={enabled}` binding are untouched. Visual only.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const THEMED_SWITCH_SRC = readFileSync(
  join(ROOT, 'components/common/ThemedSwitch.tsx'),
  'utf8',
);
const TOKENS_SRC = readFileSync(
  join(ROOT, 'theme/theme-tokens.ts'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(INDEX_SRC);
const TS_STRIPPED = stripComments(THEMED_SWITCH_SRC);

// Pulls a literal token value from theme-tokens.ts so we can prove the
// SWAP is from saturated-100%-sage to 50%-alpha sage at the value level,
// not just the token name level. Same helper class as F10's opacity
// guard (carePlanMedsDrawerSwipeRest32A1) — value-level pins survive
// future token aliasing.
function tokenValue(src: string, key: string): string | null {
  // Theme tokens are quoted strings: `name: 'value',`. Capture
  // whatever sits between the quote chars — robust to rgba() /
  // hsla() values that contain internal commas (F10's helper
  // walked up to the first comma which broke for rgba). Quote
  // char is one of ' " or backtick.
  const re = new RegExp(`\\b${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`);
  const m = src.match(re);
  return m ? m[1].trim() : null;
}

describe('Phase 33 F3 — Care Plan toggle Switch goes muted (calmer ON state)', () => {
  // --------------------------------------------------------------------------
  // ON track — the only color that changes. accent → accentMuted.
  // --------------------------------------------------------------------------

  it('contract 1: ThemedSwitch trackColor.true is colors.accentMuted (NOT colors.accent)', () => {
    // Pin the new token reference + reject the old saturated one — now
    // in the shared ThemedSwitch (the single home post-extraction).
    expect(TS_STRIPPED).toMatch(/trackColor=\{\s*\{\s*false\s*:\s*colors\.glassStrong\s*,\s*true\s*:\s*colors\.accentMuted\s*\}\s*\}/);
    // Hard reject of the pre-F3 saturated-sage trackColor shape.
    expect(TS_STRIPPED).not.toMatch(/trackColor=\{\s*\{\s*[^}]*true\s*:\s*colors\.accent\s*[,}]/);
  });

  it('contract 2: c.accentMuted resolves to the canon 50%-alpha sage rgba(95,184,138,0.50)', () => {
    // Value-level proof — accentMuted is the SAME sage as accent
    // (RGB 95/184/138) at 0.5 alpha. Catches a future palette move
    // that aliases accentMuted to something other than half-strength
    // sage.
    const v = tokenValue(TOKENS_SRC, 'accentMuted');
    expect(v).not.toBeNull();
    // Normalize whitespace for the comparison.
    const normalized = v!.replace(/\s+/g, '');
    expect(normalized).toBe('rgba(95,184,138,0.50)');
  });

  // --------------------------------------------------------------------------
  // The four "unchanged" decisions — pin them so a future "let's also
  // mute the thumb" or "let's pick a different OFF color" drift gets
  // caught by F3's own contract, not discovered on a device walk.
  // --------------------------------------------------------------------------

  it('contract 3: ON thumb stays colors.textPrimary (cream-on-muted-sage holds the ON signal)', () => {
    expect(TS_STRIPPED).toMatch(/thumbColor=\{value\s*\?\s*colors\.textPrimary\s*:\s*colors\.switchThumbOff\}/);
  });

  it('contract 4: OFF track stays colors.glassStrong (already the receded cream-muted treatment)', () => {
    expect(TS_STRIPPED).toMatch(/trackColor=\{\s*\{\s*false\s*:\s*colors\.glassStrong\b/);
  });

  it('contract 5: OFF thumb stays colors.switchThumbOff (system iOS off-white)', () => {
    // Same pin as contract 3, scoped to the false branch.
    expect(TS_STRIPPED).toMatch(/\?\s*colors\.textPrimary\s*:\s*colors\.switchThumbOff\}/);
  });

  it('contract 6: ios_backgroundColor stays colors.glassStrong (matches OFF track at the rail)', () => {
    expect(TS_STRIPPED).toMatch(/ios_backgroundColor=\{colors\.glassStrong\}/);
  });

  // --------------------------------------------------------------------------
  // Behavior lock — CategoryRow keeps its binding, now via the shared
  // ThemedSwitch (visual-only extraction; no behavior touch).
  // --------------------------------------------------------------------------

  it('contract 7: CategoryRow renders <ThemedSwitch value={enabled} onValueChange={onToggle} /> (binding unchanged, now via the shared toggle)', () => {
    expect(STRIPPED).toMatch(/<ThemedSwitch\b[\s\S]*?value=\{enabled\}[\s\S]*?onValueChange=\{onToggle\}/);
    // The raw saturated/iOS-green <Switch> is gone from this screen.
    expect(STRIPPED).not.toMatch(/<Switch\b/);
  });
});
