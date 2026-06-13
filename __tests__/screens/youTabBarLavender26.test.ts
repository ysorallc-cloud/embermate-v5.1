// ============================================================================
// Phase 26 F1 → Phase 33b Scope 2 reframe — bottom nav uniform sage-active.
//
// Phase 26 F1 routed the support tab through caregiverAccent (lavender)
// at active + inactive states so the You lane read distinct from the
// operational sage triplet. Phase 33b Scope 2 (Q-33b.6 lock (a)) retired
// that override per the website canon — nav is structural navigation,
// not content-chrome; canon nav uses cream-default-no-color. All 4 tabs
// now inherit the global colors.accent active / colors.textMuted
// inactive tint, including support.
//
// The Phase 26 F2 boundary hairline at left: '75%' survives — it's
// structural grouping (operational triplet + You), not lane-chrome.
//
// Pinned contracts (Phase 33b Scope 2):
//   1. The support Tabs.Screen does NOT override tabBarActiveTintColor.
//   2. The support Tabs.Screen does NOT override tabBarInactiveTintColor.
//   3. The support TabIcon passes colors.accent (sage) as the accent
//      prop — uniform with the operational tabs.
//   4. All 4 operational tabs (now / journal / understand / support)
//      inherit the global sage-active / cream-muted-inactive pattern.
//   5. No bare colors.caregiverAccent reference remains in this file
//      (nav lavender retired entirely; defends against Phase 26 F1
//      style drift back).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/_layout.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

// Strip comments so the migration prose in the file header can't false-
// positive against any absence pin.
const STRIPPED = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

// Return the source span for a given <Tabs.Screen name="X" ... /> block.
// The block ends at the next sibling Tabs.Screen open or the </Tabs> close,
// whichever comes first. Robust against self-closing JSX inside the block
// (e.g. the inline <TabIcon ... /> that the screen options reference).
function tabsScreenBlock(name: string): string {
  const startMatch = STRIPPED.match(
    new RegExp(`<Tabs\\.Screen\\s+name="${name}"`, 'm'),
  );
  if (!startMatch || startMatch.index === undefined) return '';
  const startIdx = startMatch.index;
  const after = STRIPPED.slice(startIdx + startMatch[0].length);
  const sentinel = after.match(/<Tabs\.Screen\s+name=|<\/Tabs>/);
  const endIdx = sentinel && sentinel.index !== undefined
    ? startIdx + startMatch[0].length + sentinel.index
    : STRIPPED.length;
  return STRIPPED.slice(startIdx, endIdx);
}

describe('Bottom nav active-tint contract — F7 C6c-A Option D reframe', () => {
  // F7 C6c-A (2026-06-12) retired Phase 33b Scope 2's "no per-tab
  // override on support" rule. Per Option D, the You tab gets its own
  // dusty-blue (#6b8cae) active tint via a tabBarActiveTintColor
  // override; the operational triplet (now / journal / understand)
  // stays on colors.accent (sage). The You-lane caregiver palette
  // explicitly lives in this nav slot under F7 — distinct from the
  // lavender-retire that the broader Phase 33b Scope 2 enforced
  // elsewhere.

  it('contract 1 [F7 C6c-A]: the support Tabs.Screen overrides tabBarActiveTintColor to dusty blue', () => {
    const block = tabsScreenBlock('support');
    expect(block).toBeTruthy();
    expect(block).toMatch(/tabBarActiveTintColor:\s*DUSTY/);
  });

  it('contract 2: the support Tabs.Screen does NOT override tabBarInactiveTintColor', () => {
    // Inactive label still inherits the global colors.textMuted — only
    // the active tint flips under Option D.
    const block = tabsScreenBlock('support');
    expect(block).toBeTruthy();
    expect(block).not.toMatch(/tabBarInactiveTintColor:/);
  });

  it('contract 3 [F7 C6c-A]: the support tab uses YouTabIcon (not the shared TabIcon component)', () => {
    // Option D replaces the heart-glyph TabIcon with an avatar circle
    // that carries the caregiver initial in dusty blue. The shared
    // TabIcon stays on the operational triplet.
    const block = tabsScreenBlock('support');
    expect(block).toMatch(/<YouTabIcon\b/);
    expect(block).not.toMatch(/<TabIcon\s+name="support"/);
  });

  it('contract 4 [F7 C6c-A]: only the support tab overrides activeTintColor; the operational triplet inherits the global sage', () => {
    for (const name of ['now', 'journal', 'understand']) {
      const block = tabsScreenBlock(name);
      expect(block).toBeTruthy();
      expect(block).not.toMatch(/tabBarActiveTintColor:/);
      expect(block).not.toMatch(/tabBarInactiveTintColor:/);
    }
  });

  it('contract 5: the operational triplet passes colors.accent (sage) to TabIcon — no per-tab tint leak', () => {
    for (const name of ['now', 'journal', 'understand']) {
      const block = tabsScreenBlock(name);
      expect(block).toMatch(/accent=\{colors\.accent\}/);
      expect(block).not.toMatch(/accent=\{colors\.caregiverAccent\}/);
    }
  });

  it('contract 6: no bare colors.caregiverAccent reference remains in the tab-layout source', () => {
    // Cross-axis pin: post-F7-purple-retirement, caregiverAccent token
    // is dusty-valued, but the nav layout intentionally uses the
    // DUSTY local constant for clarity. The token name should not
    // appear in this file.
    expect(STRIPPED).not.toMatch(/colors\.caregiverAccent\b/);
  });
});
