// ============================================================================
// Reminder timing — source-pattern contract for the new sub-screen.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const filePath = join(ROOT, 'app/settings/reminders/timing.tsx');
const src = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

describe('Reminder timing screen — file structure', () => {
  it('exists at app/settings/reminders/timing.tsx', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('exports a default React component', () => {
    expect(src).toMatch(/export\s+default\s+function\s+ReminderTimingScreen/);
  });

  it('reads + writes prefs through the canonical repo', () => {
    expect(src).toMatch(/getReminderPreferences\(\)/);
    expect(src).toMatch(/updateReminderPreferences\(/);
  });
});

describe('Reminder timing — header copy', () => {
  it('uses the v6.7 plain-language header', () => {
    expect(src).toMatch(/title="Reminder timing"/);
    expect(src).toMatch(/subtitle="When you'd like to be nudged"/);
  });
});

describe('Reminder timing — Smart timing toggle', () => {
  it('exposes a smart timing switch bound to prefs.smartTiming', () => {
    expect(src).toMatch(/testID="smart-timing-toggle"/);
    expect(src).toMatch(/value=\{prefs\.smartTiming\}/);
  });

  it('shows the "Available after 14 days of logs." helper when disabled', () => {
    expect(src).toContain('Available after 14 days of logs.');
  });
});

describe('Reminder timing — per-category advance pickers', () => {
  it('renders a row for medications, vitals, wellness, and meals', () => {
    // The rows use a template-literal testID `advance-row-${cat}`.
    expect(src).toMatch(/testID=\{`advance-row-/);
    const visibleArrayMatch = src.match(/visibleCats[^=]*=\s*\[[^\]]+\]/);
    expect(visibleArrayMatch).not.toBeNull();
    for (const c of ['medications', 'vitals', 'wellness', 'meals']) {
      expect(visibleArrayMatch![0]).toContain(`'${c}'`);
    }
  });

  it('uses an eyebrow header for the section', () => {
    expect(src).toContain('PER-CATEGORY DEFAULTS');
  });

  it('options are: At time / 5 min before / 15 min before / 30 min before / 1 hour before / Off', () => {
    expect(src).toContain('At time');
    expect(src).toContain('5 min before');
    expect(src).toContain('15 min before');
    expect(src).toContain('30 min before');
    expect(src).toContain('1 hour before');
    expect(src).toContain("'Off'");
  });
});

describe('Reminder timing — escalation toggles', () => {
  it('renders escalation toggles for medications, vitals, and wellness', () => {
    expect(src).toMatch(/testID=\{`escalation-toggle-/);
    const escalationArrayMatch = src.match(/escalationCats[^=]*=\s*\[[^\]]+\]/);
    expect(escalationArrayMatch).not.toBeNull();
    for (const c of ['medications', 'vitals', 'wellness']) {
      expect(escalationArrayMatch![0]).toContain(`'${c}'`);
    }
  });

  it('does NOT include meals in the escalation list', () => {
    const escalationArrayMatch = src.match(/escalationCats[^=]*=\s*\[[^\]]+\]/);
    expect(escalationArrayMatch).not.toBeNull();
    expect(escalationArrayMatch![0]).not.toContain("'meals'");
  });

  it('uses an eyebrow header for the follow-up section', () => {
    expect(src).toContain('FOLLOW-UP REMINDERS');
  });

  it('row subtitle reads "Send a follow-up if not logged within 30 min"', () => {
    expect(src).toContain('Send a follow-up if not logged within 30 min');
  });
});
