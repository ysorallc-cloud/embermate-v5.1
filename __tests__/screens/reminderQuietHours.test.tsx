// ============================================================================
// Quiet hours — source-pattern contract.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const filePath = join(ROOT, 'app/settings/reminders/quiet-hours.tsx');
const src = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

describe('Quiet hours screen — file structure', () => {
  it('exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('exports a default React component', () => {
    expect(src).toMatch(/export\s+default\s+function\s+QuietHoursScreen/);
  });

  it('reads + writes prefs through the canonical repo', () => {
    expect(src).toMatch(/getReminderPreferences\(\)/);
    expect(src).toMatch(/updateReminderPreferences\(/);
  });
});

describe('Quiet hours — header copy', () => {
  it('uses the v6.7 plain-language header', () => {
    expect(src).toMatch(/title="Quiet hours"/);
    expect(src).toMatch(/subtitle="When EmberMate stays quiet"/);
  });
});

describe('Quiet hours — toggles + pickers', () => {
  it('exposes a master enable toggle bound to quietHours.enabled', () => {
    expect(src).toMatch(/testID="quiet-hours-enabled"/);
    expect(src).toMatch(/value=\{q\.enabled\}/);
  });

  it('renders Start and End hour pickers', () => {
    expect(src).toMatch(/testID="quiet-hours-start"/);
    expect(src).toMatch(/testID="quiet-hours-end"/);
  });

  it('renders the "Quiet on weekends only" toggle (default off)', () => {
    expect(src).toMatch(/testID="weekends-only-toggle"/);
    expect(src).toContain('Quiet on weekends only');
  });

  it('renders the "Allow critical reminders" toggle with the helper line', () => {
    expect(src).toMatch(/testID="allow-critical-toggle"/);
    expect(src).toContain('Allow critical reminders during quiet hours');
    expect(src).toContain("We'll still alert for urgent things, like missed doses past their window.");
  });
});

describe('Quiet hours — formatting', () => {
  it('uses the formatTime primitive (respects the 12h/24h preference)', () => {
    expect(src).toMatch(/formatTime\(/);
  });
});
