// ============================================================================
// Support Tab — Warm Room verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const supportPath = path.resolve(__dirname, '../../app/(tabs)/support.tsx');
const src = fs.readFileSync(supportPath, 'utf-8');

const layoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

// Token values are read from the dark theme source (Warm Room is a dark-only
// surface). Source-file assertions here just confirm support.tsx wires through
// the right token names; hex values are asserted against the token module
// itself so that a token recolor is detected at the right layer.
const themeTokensPath = path.resolve(__dirname, '../../theme/theme-tokens.ts');
const themeTokensSrc = fs.readFileSync(themeTokensPath, 'utf-8');

function readDarkTokenValue(name: string): string | null {
  // Match the token within the DarkColors block: `name: '#hex'` or `name: 'rgba(...)'`
  const re = new RegExp(`\\b${name}:\\s*'([^']+)'`);
  const m = themeTokensSrc.match(re);
  return m ? m[1] : null;
}

describe('You tab — Warm Room', () => {
  it('renders with default export', () => {
    expect(src).toContain('export default function SupportScreen');
  });

  it('warm room header: tab title is "You"', () => {
    // Tab renamed from "Support" → "You" (self-care framing). The
    // multi-paragraph subtitle was collapsed to a single line in v6.7
    // (see __tests__/copy/headerSubtitlesUpdated.test.ts).
    expect(src).toContain('>You</Text>');
  });

  it('warm background: token-driven (not a hardcoded hex), and not pure black', () => {
    // support.tsx uses c.background as the root surface — verify the screen
    // wires through a token (no inline #000000) and that the token resolves
    // to a near-black warm value, not pure black.
    expect(src).toContain('backgroundColor: c.background');
    expect(src).not.toContain("'#000000'");
    const bg = readDarkTokenValue('background');
    expect(bg).not.toBeNull();
    expect(bg).not.toBe('#000');
    expect(bg).not.toBe('#000000');
    // Current value: '#0a0c0a' — nearly-black, slight green tint. If this
    // token is intentionally recolored, update the expectation here.
    expect(bg).toBe('#0a0c0a');
  });

  it('warm card surface system: green + purple + quiet warm-card tokens are wired', () => {
    // The Warm Room layers three card tints on top of the root background.
    // Verify the screen references each warm token, then assert the token
    // values themselves so a palette change is detected at the token layer.
    expect(src).toContain('c.warmSurface');
    expect(src).toContain('c.warmSurfaceGreen');
    expect(src).toContain('c.warmSurfacePurple');
    expect(src).toContain('c.warmSurfaceQuiet');

    // Token values (current): asserts the green card surface still uses the
    // expected hex pair so accessibility contrast doesn't drift unnoticed.
    // Lifted in v6.7 to clear the L* 6 delta threshold from background —
    // see __tests__/theme/cardContrast.test.ts for the contrast contract.
    expect(readDarkTokenValue('warmSurfaceGreen')).toBe('#1a2620');
    expect(readDarkTokenValue('warmSurfaceGreenBorder')).toBe('#26382e');
  });

  it('dual-primary layout: mood + breathing side by side', () => {
    expect(src).toContain('primaryRow');
    expect(src).toContain('primaryCard');
    expect(src).toContain('primaryCardLeft');
    expect(src).toContain('primaryCardRight');
  });

  it('inline mood emoji row (replaces MoodSlider component)', () => {
    expect(src).toContain('emojiRow');
    expect(src).toContain('emojiCircle');
    expect(src).toContain('selectedMoodIndex');
    expect(src).toContain('MOOD_POSITIONS');
    expect(src).toContain('AFFIRMATIONS');
    expect(src).toContain('Log this');
    // MoodSlider component is no longer rendered directly
    expect(src).not.toContain('<MoodSlider');
  });

  it('breathing card in primary row', () => {
    expect(src).toContain('Take a breath');
    expect(src).toContain('breathePlayTriangle');
    expect(src).toContain('setBreathingVisible(true)');
  });

  it('compact contact tiles: helpline + community', () => {
    expect(src).toContain('contactTilesRow');
    expect(src).toContain('contactTile');
    expect(src).toContain('Linking.openURL');
    expect(src).toContain('Helpline');
    expect(src).toContain('Community');
  });

  it('resources card: quiet variant', () => {
    expect(src).toContain('warmCardQuiet');
    expect(src).toContain('Plan ahead');
    expect(src).toContain('When things are calm');
  });

  it('wellness link routes to caregiver-wellness', () => {
    // The full quiet-card title was collapsed to a compact row in v6.7 —
    // see __tests__/screens/youTabWellnessLink.test.ts for the new label
    // contract ("YOUR WELLNESS OVER TIME"). Keep the navigation invariant.
    expect(src).toContain('wellnessLink');
    expect(src).toContain("navigate('/caregiver-wellness')");
  });

  it('breathing + resources components render', () => {
    expect(src).toContain('breathePlayTriangle');
    expect(src).toContain('setBreathingVisible(true)');
    expect(src).toContain('<ResourcesList');
  });

  it('footer affirmation', () => {
    expect(src).toContain("You're doing something");
    expect(src).toContain('most people never see.');
  });

  it('no uppercase section headers in body content', () => {
    // The body sections (mood / breath / reach-out) were converted to
    // sentence-case copy in v6.6. The compact wellness-link label
    // ("YOUR WELLNESS OVER TIME") is the one intentional all-caps, kept
    // because it reads as a label-style row label rather than a section
    // header — see Phase 4 in the You-tab redesign.
    expect(src).not.toContain('CHECK IN');
    expect(src).not.toContain('BREATHE');
    expect(src).not.toContain('REACH OUT');
  });

  it('tab bar: You tab is last (after Insights)', () => {
    expect(layoutContent).toContain('name="support"');
    const insightsIdx = layoutContent.indexOf('name="understand"');
    const supportIdx = layoutContent.indexOf('name="support"');
    expect(insightsIdx).toBeLessThan(supportIdx);
  });

  it('AuroraBackground with support variant', () => {
    expect(src).toContain('variant="support"');
  });
});
