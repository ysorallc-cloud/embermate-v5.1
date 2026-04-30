// ============================================================================
// Sound and vibration — source-pattern contract.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const filePath = join(ROOT, 'app/settings/reminders/sound.tsx');
const src = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

describe('Sound and vibration screen — file structure', () => {
  it('exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('exports a default React component', () => {
    expect(src).toMatch(/export\s+default\s+function\s+ReminderSoundScreen/);
  });
});

describe('Sound and vibration — header copy', () => {
  it('uses the v6.7 plain-language header', () => {
    expect(src).toMatch(/title="Sound and vibration"/);
    expect(src).toMatch(/subtitle="How reminders feel"/);
  });
});

describe('Sound options — Gentle / Standard / Silent (radio-style)', () => {
  it('renders all three options as radios', () => {
    // testID uses a template literal `sound-option-${value}` against the
    // SOUND_OPTIONS array.
    expect(src).toMatch(/testID=\{`sound-option-/);
    const optionsMatch = src.match(/SOUND_OPTIONS[^=]*=[\s\S]*?\];/);
    expect(optionsMatch).not.toBeNull();
    expect(optionsMatch![0]).toContain("'gentle'");
    expect(optionsMatch![0]).toContain("'standard'");
    expect(optionsMatch![0]).toContain("'silent'");
  });

  it('Gentle is recommended', () => {
    expect(src).toContain('A soft chime and light vibration. Recommended.');
  });

  it('Standard maps to "iOS default sound."', () => {
    expect(src).toContain('iOS default sound.');
  });

  it('Silent maps to "Vibration only."', () => {
    expect(src).toContain('Vibration only.');
  });

  it('uses accessibilityRole="radio" for the option rows', () => {
    expect(src).toMatch(/accessibilityRole="radio"/);
  });
});

describe('Sound and vibration — DND respect toggle', () => {
  it('exposes a "respect iOS DND" switch bound to prefs.respectSystemDND', () => {
    expect(src).toMatch(/testID="respect-dnd-toggle"/);
    expect(src).toMatch(/value=\{prefs\.respectSystemDND\}/);
  });

  it('shows the helper line about iPhone focus modes', () => {
    expect(src).toContain("When on, your iPhone's focus modes silence EmberMate too.");
  });
});
