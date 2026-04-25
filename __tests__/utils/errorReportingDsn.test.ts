// ============================================================================
// 1_BLOCKERS Fix 5 — Sentry DSN graceful handling
// ============================================================================
//
// Verifies the error-reporting init path tolerates a missing DSN without
// crashing or coupling to a placeholder host. Also verifies app.json wires
// the DSN through `expo.extra.sentryDsn` so it's environment-configurable.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('errorReporting — graceful DSN handling', () => {
  const src = read('utils/errorReporting.ts');

  it('reads DSN from Constants.expoConfig.extra.sentryDsn', () => {
    expect(src).toMatch(/Constants\.expoConfig\?\.extra\?\.sentryDsn/);
  });

  it('falls back to an empty string when DSN is missing', () => {
    // The previous fallback was the literal `'YOUR_DSN_HERE'` which would
    // be passed to Sentry.init and crash. Now it falls back to '' so the
    // skip-init guard catches it.
    expect(src).toMatch(/sentryDsn\s*\?\?\s*['"]['"]/);
  });

  it('does NOT use the placeholder string as the fallback value', () => {
    // The placeholder string can still appear in the skip guard (for
    // backwards compat with old configs), but must not be the value
    // assigned to SENTRY_DSN when extra.sentryDsn is undefined.
    expect(src).not.toMatch(/sentryDsn\s*\?\?\s*['"]YOUR_DSN_HERE['"]/);
  });

  it('skips Sentry.init when DSN is empty or the placeholder', () => {
    expect(src).toMatch(/if\s*\(\s*!\s*SENTRY_DSN\s*\|\|\s*SENTRY_DSN\s*===\s*['"]YOUR_DSN_HERE['"]\s*\)/);
  });

  it('logs a single dev-mode notice when crash reporting is disabled', () => {
    expect(src).toContain("crash reporting disabled");
    expect(src).toMatch(/if\s*\(\s*__DEV__\s*\)/);
  });

  it('initErrorReporting is idempotent (early-return on already initialized)', () => {
    expect(src).toMatch(/if\s*\(\s*initialized\s*\)\s*return/);
  });
});

describe('app.json — sentryDsn extra config', () => {
  const appJson = JSON.parse(read('app.json'));

  it('exposes expo.extra.sentryDsn so the value is environment-configurable', () => {
    expect(appJson.expo).toBeDefined();
    expect(appJson.expo.extra).toBeDefined();
    expect(appJson.expo.extra).toHaveProperty('sentryDsn');
  });

  it('sentryDsn is a string (may be empty for dev/test builds)', () => {
    expect(typeof appJson.expo.extra.sentryDsn).toBe('string');
  });
});
