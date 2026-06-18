// ============================================================================
// You-tab Settings entry (settings-entry branch — stranding fix).
//
// Settings is fully built (app/settings/index.tsx + subscreens) but was
// unreachable from any main tab: the gear was retired from the Insights
// header (F7) and the You tab never got a replacement. That stranded
// Sample Data (and everything else under Settings). This pins the single
// canonical entry: a Settings gear in the You-tab header that routes to
// /settings.
//
// Source-pin (You-tab test convention, per supportCaregiverChip26): the
// tab mounts a deep tree of caregiver-wellness widgets; we assert the
// control's SHAPE in source rather than mounting the whole surface.
//
// CONTRACTS:
//   1. The You tab renders a Settings gear — Ionicons 'settings-outline'.
//   2. Its touchable navigates to /settings.
//   3. NEUTRAL icon color (navigation, not status) — references a neutral
//      text token, NOT colors.accent.
//   4. The control is an accessible, labeled button.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../app/(tabs)/support.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}
const STRIPPED = stripComments(SRC);

describe('You-tab Settings entry — single canonical gear → /settings', () => {
  it('contract 1 (GEAR RENDERS): the You tab imports Ionicons and renders a settings-outline gear', () => {
    expect(STRIPPED).toMatch(/from\s+['"]@expo\/vector-icons['"]/);
    expect(STRIPPED).toMatch(/name=["']settings-outline["']/);
  });

  it('contract 2 (ROUTES TO /settings): the gear touchable navigates to /settings', () => {
    expect(STRIPPED).toMatch(/onPress=\{\(\)\s*=>\s*navigate\(\s*['"]\/settings['"]\s*\)\}/);
  });

  it('contract 3 (NEUTRAL COLOR — navigation, not accent): the gear icon color is a neutral text token, never colors.accent', () => {
    // The Ionicons settings gear must use a neutral navigation color.
    const gearMatch = STRIPPED.match(/<Ionicons[^>]*name=["']settings-outline["'][^>]*\/>/);
    expect(gearMatch).not.toBeNull();
    const gear = gearMatch![0];
    expect(gear).toMatch(/color=\{colors\.(textSecondary|textMuted|textTertiary)\}/);
    expect(gear).not.toMatch(/color=\{colors\.accent\b/);
  });

  it('contract 4 (ACCESSIBLE BUTTON): the gear control is a labeled button', () => {
    // The touchable that routes to /settings carries an accessibility
    // label + button role (so it is reachable and announced).
    const block = STRIPPED.slice(
      Math.max(0, STRIPPED.indexOf("navigate('/settings')") - 400),
      STRIPPED.indexOf("navigate('/settings')") + 400,
    );
    expect(block).toMatch(/accessibilityRole=["']button["']/);
    expect(block).toMatch(/accessibilityLabel=/);
  });
});
