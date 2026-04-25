// ============================================================================
// 1_BLOCKERS Fix 6 — Version bump verification
// ============================================================================
//
// Asserts the v6 release metadata is in place: app.json version, Android
// versionCode increment, and the CHANGELOG entry. iOS buildNumber is
// auto-incremented by EAS so it isn't asserted to a specific value.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('app.json — v6 release metadata', () => {
  const appJson = JSON.parse(read('app.json'));

  it('version is at least 6.5.0', () => {
    const [major, minor] = appJson.expo.version.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(6);
    if (major === 6) expect(minor).toBeGreaterThanOrEqual(5);
  });

  it('android.versionCode is at least 3 (incremented for the v6 release)', () => {
    expect(typeof appJson.expo.android.versionCode).toBe('number');
    expect(appJson.expo.android.versionCode).toBeGreaterThanOrEqual(3);
  });

  it('ios.buildNumber is a string and monotonically incrementable', () => {
    // Build numbers are auto-incremented by EAS — we don't lock to a value,
    // we just verify the field exists as a string per Expo's expected shape.
    expect(typeof appJson.expo.ios.buildNumber).toBe('string');
    expect(appJson.expo.ios.buildNumber.length).toBeGreaterThan(0);
  });
});

describe('CHANGELOG.md — v6 release notes', () => {
  it('CHANGELOG.md exists at the project root', () => {
    expect(existsSync(join(ROOT, 'CHANGELOG.md'))).toBe(true);
  });

  const changelog = read('CHANGELOG.md');

  it('starts with a top-level Changelog header', () => {
    expect(changelog).toMatch(/^# Changelog/);
  });

  it('includes the 6.0.0 release section', () => {
    expect(changelog).toMatch(/##\s*6\.0\.0/);
  });

  it('mentions every shipping tab', () => {
    expect(changelog).toMatch(/Now tab/);
    expect(changelog).toMatch(/Journal tab/);
    expect(changelog).toMatch(/You tab/);
    expect(changelog).toMatch(/Insights tab/);
  });

  it('mentions design system + infrastructure changes', () => {
    expect(changelog).toMatch(/Design system/);
    expect(changelog).toMatch(/Infrastructure/);
  });

  it('does not contain unparsed XML/HEREDOC artifacts', () => {
    expect(changelog).not.toContain('</content>');
    expect(changelog).not.toContain('</invoke>');
  });
});
