import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/settings/index.tsx'), 'utf8');

describe('Settings — no duplicate theme control', () => {
  it("'Theme' appears at most once (as a pill label, not a settings row)", () => {
    // Count occurrences of the literal string "Theme" as a settings item title.
    // The Appearance pill labels are 'Light', 'Dark', 'Auto' — not 'Theme'.
    const matches = src.match(/title:\s*'Theme'/g) || [];
    expect(matches.length).toBe(0);
  });

  it('no setThemeMode call remains in settings', () => {
    expect(src).not.toMatch(/setThemeMode\s*\(/);
  });

  it('High Contrast setting is preserved', () => {
    expect(src).toContain("'high-contrast'");
    expect(src).toContain('High Contrast');
  });
});
