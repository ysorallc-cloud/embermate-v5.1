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

describe('Phase 33b Scope 2 — bottom nav uniform sage-active (Phase 26 F1 lavender retired)', () => {
  it('contract 1: the support Tabs.Screen does NOT override tabBarActiveTintColor', () => {
    // Phase 26 F1 set this to colors.caregiverAccent; Phase 33b Scope 2
    // retired the override. Support tab inherits the global sage-active
    // tint set in screenOptions.
    const block = tabsScreenBlock('support');
    expect(block).toBeTruthy();
    expect(block).not.toMatch(/tabBarActiveTintColor:/);
  });

  it('contract 2: the support Tabs.Screen does NOT override tabBarInactiveTintColor', () => {
    // Phase 26 F1 set this to a muted lavender; Phase 33b Scope 2 retired
    // the override. Support tab inherits the global colors.textMuted
    // inactive tint set in screenOptions.
    const block = tabsScreenBlock('support');
    expect(block).toBeTruthy();
    expect(block).not.toMatch(/tabBarInactiveTintColor:/);
  });

  it('contract 3: the support TabIcon passes colors.accent (sage) as the accent prop', () => {
    // Phase 26 F1 passed colors.caregiverAccent for the active dot;
    // Phase 33b Scope 2 unified all 4 TabIcons on colors.accent. The
    // active dot under the icon now sages along with the operational
    // tabs.
    const block = tabsScreenBlock('support');
    expect(block).toMatch(/accent=\{colors\.accent\}/);
    // Negative pin: must not still hardcode lavender accent.
    expect(block).not.toMatch(/accent=\{colors\.caregiverAccent\}/);
  });

  it('contract 4: all 4 tabs (including support) inherit the global tint pattern', () => {
    // Phase 26 F1 split the support tab off; Phase 33b Scope 2 brought
    // it back under the uniform inheritance pattern. No per-screen tint
    // overrides on any tab.
    for (const name of ['now', 'journal', 'understand', 'support']) {
      const block = tabsScreenBlock(name);
      expect(block).toBeTruthy();
      expect(block).not.toMatch(/tabBarActiveTintColor:/);
      expect(block).not.toMatch(/tabBarInactiveTintColor:/);
    }
  });

  it('contract 5: all 4 tabs pass colors.accent (sage) to TabIcon — no lavender-leak in nav', () => {
    for (const name of ['now', 'journal', 'understand', 'support']) {
      const block = tabsScreenBlock(name);
      expect(block).toMatch(/accent=\{colors\.accent\}/);
      expect(block).not.toMatch(/accent=\{colors\.caregiverAccent\}/);
    }
  });

  it('contract 6 (NEW): no bare colors.caregiverAccent reference remains in the tab-layout source', () => {
    // Cross-axis pin defending against Phase 26 F1 style drift back.
    // The lavender garnish on the You lane lives at content-chrome
    // scale (caregiver chip, eyebrows) — not nav-chrome scale.
    expect(STRIPPED).not.toMatch(/colors\.caregiverAccent\b/);
  });
});
