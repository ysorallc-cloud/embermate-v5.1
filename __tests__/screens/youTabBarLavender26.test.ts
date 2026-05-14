// ============================================================================
// Phase 26 F1 — You-tab visual identity, tab-bar wiring.
//
// Pre-26 every Tabs.Screen passed colors.accent (sage) to its TabIcon and
// the global tabBarActiveTintColor / tabBarInactiveTintColor were the only
// per-tab tint controls. Result: the You tab read as a fourth operational
// tab rather than a separate caregiver lane.
//
// Phase 26 F1 routes the support tab — and only the support tab — through
// caregiverAccent at both states:
//   • Active tint + dot accent: colors.caregiverAccent (lavender).
//   • Inactive tint: a muted lavender so the lane stays visible at rest
//     ("exists but not current") rather than dropping to the operational
//     gray (colors.textMuted) used by the global default.
//
// Pinned contracts:
//   1. The support Tabs.Screen sets its own tabBarActiveTintColor to
//      colors.caregiverAccent (overriding the global sage).
//   2. The support Tabs.Screen sets its own tabBarInactiveTintColor to
//      a lavender — NOT the global colors.textMuted gray.
//   3. The support Tabs.Screen passes caregiverAccent (not colors.accent)
//      as the TabIcon accent prop, so the active dot lavenders.
//   4. The operational tabs (now / journal / understand) do NOT carry
//      per-screen tint overrides — they inherit the global sage.
//   5. The operational tabs continue to pass colors.accent to TabIcon.
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

describe('Phase 26 F1 — You-tab caregiverAccent wiring', () => {
  it('contract 1: the support Tabs.Screen overrides tabBarActiveTintColor to caregiverAccent', () => {
    const block = tabsScreenBlock('support');
    expect(block).toBeTruthy();
    expect(block).toMatch(/tabBarActiveTintColor:\s*colors\.caregiverAccent/);
  });

  it('contract 2: the support Tabs.Screen tabBarInactiveTintColor is a lavender — NOT colors.textMuted', () => {
    const block = tabsScreenBlock('support');
    expect(block).toBeTruthy();
    // Must NOT inherit the operational gray.
    expect(block).not.toMatch(/tabBarInactiveTintColor:\s*colors\.textMuted/);
    // Must route through a lavender. Three acceptable shapes for a
    // "muted caregiverAccent":
    //   (a) the canonical theme token: colors.caregiverAccent (and the
    //       variants — caregiverAccentText, caregiverAccentHint, etc.)
    //   (b) a file-local constant whose name advertises lavender intent
    //       (CAREGIVER_ACCENT_INACTIVE, CAREGIVER_ACCENT_DIM, etc.)
    //   (c) an inline rgba expressed against the canonical hue
    //       (170, 138, 220) so a code reader sees lavender at-a-glance.
    // The test pins the semantic intent, not any single mechanism.
    const tintValue = block.match(/tabBarInactiveTintColor:\s*([^,]+?)\s*,/);
    expect(tintValue).toBeTruthy();
    const v = tintValue![1];
    expect(v).toMatch(/caregiverAccent|CAREGIVER_ACCENT|rgba\(\s*170,\s*138,\s*220/i);
  });

  it('contract 3: the support TabIcon receives caregiverAccent as the accent prop (drives the active dot)', () => {
    const block = tabsScreenBlock('support');
    expect(block).toMatch(/accent=\{colors\.caregiverAccent\}/);
    // Negative pin: must not still hardcode the sage accent.
    expect(block).not.toMatch(/accent=\{colors\.accent\}/);
  });

  it('contract 4: operational tabs (now / journal / understand) do NOT override the global tint', () => {
    // Inheriting the global colors.accent active tint is what keeps the
    // operational triplet visually unified as one lane.
    for (const name of ['now', 'journal', 'understand']) {
      const block = tabsScreenBlock(name);
      expect(block).toBeTruthy();
      expect(block).not.toMatch(/tabBarActiveTintColor:/);
      expect(block).not.toMatch(/tabBarInactiveTintColor:/);
    }
  });

  it('contract 5: operational tabs continue to pass colors.accent to TabIcon', () => {
    for (const name of ['now', 'journal', 'understand']) {
      const block = tabsScreenBlock(name);
      expect(block).toMatch(/accent=\{colors\.accent\}/);
      // And do NOT lavender-leak.
      expect(block).not.toMatch(/accent=\{colors\.caregiverAccent\}/);
    }
  });
});
