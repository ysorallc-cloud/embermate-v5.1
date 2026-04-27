// ============================================================================
// Settings — Appearance picker removed in v6.7 (light mode disabled).
// Asserts the three-pill Light/Dark/Auto picker is gone, while the
// "Appearance & Experience" category header (now containing only High
// Contrast + 24-Hour Time Format) remains.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/settings/index.tsx'),
  'utf8',
);

describe('Settings — three-pill Appearance picker removed', () => {
  it('does not render the appearance pill row', () => {
    expect(src).not.toMatch(/<View\s+style=\{styles\.appearancePillRow\}/);
    expect(src).not.toMatch(/styles\.appearancePill\b/);
    expect(src).not.toMatch(/styles\.appearancePillActive/);
  });

  it('does not render the Light / Dark / Auto pill triple', () => {
    // The map fixture used to declare three mode keys back-to-back.
    expect(src).not.toMatch(/key:\s*['"]light['"][\s\S]*?key:\s*['"]dark['"][\s\S]*?key:\s*['"]auto['"]/);
    // And no longer wires the picker via setMode.
    expect(src).not.toMatch(/onPress=\{\(\)\s*=>\s*setMode\(/);
  });

  it('does not render the "Auto follows your phone\'s system setting" helper', () => {
    expect(src).not.toContain("Auto follows your phone's system setting");
  });

  it('does not import ThemeMode (no longer needed once the picker is gone)', () => {
    expect(src).not.toMatch(/import\s*\{[^}]*\bThemeMode\b[^}]*\}\s*from/);
  });
});

describe('Settings — Appearance & Experience section preserved', () => {
  it('keeps the "Appearance & Experience" category header', () => {
    expect(src).toContain("Appearance & Experience");
  });

  it('keeps the High Contrast row', () => {
    expect(src).toContain("title: 'High Contrast'");
    expect(src).toMatch(/setHighContrast\(/);
  });

  it('keeps the 24-Hour Time Format row', () => {
    expect(src).toContain("title: '24-Hour Time Format'");
  });
});
