/**
 * Appearance picker — Settings screen structural tests.
 *
 * Verifies the Settings screen renders an appearance picker with three
 * pills (Light, Dark, Auto), selected state styling, and helper text
 * for the 'auto' mode.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/settings/index.tsx'),
  'utf8',
);

describe('Appearance picker on Settings screen', () => {
  it('renders three pills with labels Light, Dark, Auto', () => {
    // Labels are in a data array, rendered via {m.label}
    expect(src).toContain("label: 'Light'");
    expect(src).toContain("label: 'Dark'");
    expect(src).toContain("label: 'Auto'");
  });

  it('selected pill uses accent-tinted styling', () => {
    // The selected pill should get a distinct style — look for a
    // conditional style application based on mode matching.
    expect(src).toMatch(/mode === ['"]light['"]\s*&&\s*styles\.appearancePillActive|mode === m\.key/);
  });

  it('tapping a pill calls setMode with the matching value', () => {
    // Each pill's onPress must call setMode (or setThemeMode which aliases it).
    expect(src).toMatch(/onPress=\{.*(?:setMode|setThemeMode)\s*\(/);
  });

  it("shows helper text for 'auto' mode", () => {
    expect(src).toContain("Auto follows your phone's system setting");
  });

  it("helper text is conditional on mode === 'auto'", () => {
    // The helper text should only render when auto is selected.
    expect(src).toMatch(/mode === ['"]auto['"][\s\S]*?system setting/);
  });

  it('appearance section has a header label', () => {
    expect(src).toMatch(/Appearance/);
  });

  it('pills use Ionicons (not emoji) for icons', () => {
    // Sun for Light, moon for Dark, half-circle or contrast for Auto
    expect(src).toMatch(/Ionicons[\s\S]*?sunny|name.*sunny/);
    expect(src).toMatch(/Ionicons[\s\S]*?moon|name.*moon/);
  });

  it('appearancePillActive style exists with accent border', () => {
    expect(src).toMatch(/appearancePillActive:\s*\{/);
  });
});
