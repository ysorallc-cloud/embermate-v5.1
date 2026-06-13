// ============================================================================
// Phase 13.5.3 — noExternalServers reconciliation
// ============================================================================
//
// app.json `extra.security.noExternalServers: true` is the machine-readable
// counterpart of the App Store privacy label "Data Not Collected." This file
// pins the claim's accuracy with three complementary audits:
//
//   1. No app-initiated network-call APIs in production source
//      (fetch, axios, XMLHttpRequest, WebSocket, EventSource, sendBeacon,
//       and HTTP-method clients with hardcoded URL targets).
//   2. Every https URL literal that appears in production source resolves
//      to either an approved API host (Expo OTA, Apple, Anthropic) or a
//      user-initiated browser-open destination handed to Linking.openURL.
//   3. The claim itself plus the Sentry-DSN scrub from 13.5.1 are intact.
//
// If you add app-initiated network traffic, one of these tests will fail.
// Update the allowlist below AND the privacy posture (App Store
// questionnaire + the noExternalServers claim) before landing.
// ============================================================================

import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '../..');

const SRC_DIRS = [
  'app',
  'components',
  'services',
  'utils',
  'lib',
  'hooks',
  'contexts',
  'storage',
  'theme',
  'types',
  'constants',
];

// Hosts the app may make programmatic network calls to. Expo OTA traffic is
// owned by the expo-updates SDK at the system level — no application code
// initiates it. Anthropic + Apple are listed for forward-compat; neither is
// in use today.
const APPROVED_API_HOSTS = ['u.expo.dev', 'expo.dev', 'apple.com', 'anthropic.com'];

// Hosts we hand to Linking.openURL or store as legal-URL metadata in
// app.json. These are user-initiated browser opens, not app-initiated
// network requests, so they don't conflict with the noExternalServers
// claim.
//
// 2026-06-13 — embermate.app is the canonical legal-URL host;
// ysorallc.org retired. The legacy host stays on the allowlist as
// defense-in-depth so any future doc / FAQ / migrated bookmark that
// still references it doesn't trip the audit, but no production
// source or app.json field points there anymore (see
// legalUrlsEmbermate.test.ts for the absence pin).
const USER_BROWSER_OPEN_HOSTS = [
  'embermate.app',
  'ysorallc.org',
  'caregiveraction.org',
  'play.google.com',
];

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: any[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '__tests__') continue;
      out.push(...walk(full));
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function collectFiles(): string[] {
  const out: string[] = [];
  for (const d of SRC_DIRS) out.push(...walk(join(ROOT, d)));
  return out;
}

function stripComments(src: string): string {
  // Strip /* ... */ block comments first, then // line comments.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function hostMatches(host: string, allowlist: string[]): boolean {
  return allowlist.some((h) => host === h || host.endsWith('.' + h));
}

describe('Phase 13.5.3 — network-call API audit', () => {
  // Each pattern is its own assertion so a regression points at exactly
  // which API surfaced. EventSource uses a negated-character lookaround
  // to avoid matching the LogEventSource compound identifier in
  // utils/logEvents.ts (a domain type, unrelated to the network API).
  const PATTERNS: { name: string; rx: RegExp }[] = [
    { name: 'fetch(', rx: /\bfetch\s*\(/ },
    { name: 'axios', rx: /\baxios\b/ },
    { name: 'XMLHttpRequest', rx: /\bXMLHttpRequest\b/ },
    { name: 'WebSocket', rx: /\bWebSocket\b/ },
    { name: 'EventSource', rx: /(?:^|[^A-Za-z])EventSource(?![A-Za-z])/ },
    { name: 'navigator.sendBeacon', rx: /\bnavigator\.sendBeacon\b/ },
  ];

  for (const { name, rx } of PATTERNS) {
    it(`no production source uses ${name}`, () => {
      const offenders: string[] = [];
      for (const f of collectFiles()) {
        const stripped = stripComments(readFileSync(f, 'utf8'));
        if (rx.test(stripped)) offenders.push(relative(ROOT, f));
      }
      expect(offenders).toEqual([]);
    });
  }

  // The user spec also called for .get/.post/.put/.delete/.patch scans.
  // A bare .get( is too noisy globally (Map.get, Array.find().get, etc.),
  // so we narrow to method calls whose first argument is a hardcoded URL
  // literal — the unambiguous shape of a non-fetch HTTP client.
  it('no method-call HTTP clients with hardcoded URL targets', () => {
    const URL_METHOD_PATTERN =
      /\.(get|post|put|delete|patch)\s*\(\s*['"`]https?:\/\//g;
    const offenders: string[] = [];
    for (const f of collectFiles()) {
      const stripped = stripComments(readFileSync(f, 'utf8'));
      URL_METHOD_PATTERN.lastIndex = 0;
      if (URL_METHOD_PATTERN.test(stripped)) offenders.push(relative(ROOT, f));
    }
    expect(offenders).toEqual([]);
  });
});

describe('Phase 13.5.3 — URL literal allowlist', () => {
  it('every https URL in production source + app.json is allowlisted', () => {
    const URL_PATTERN = /https?:\/\/([a-zA-Z0-9.-]+)/g;
    const violations: string[] = [];
    const filesToScan = [...collectFiles(), join(ROOT, 'app.json')];

    for (const f of filesToScan) {
      const content = readFileSync(f, 'utf8');
      URL_PATTERN.lastIndex = 0;
      let match;
      while ((match = URL_PATTERN.exec(content))) {
        const host = match[1];
        if (hostMatches(host, APPROVED_API_HOSTS)) continue;
        if (hostMatches(host, USER_BROWSER_OPEN_HOSTS)) continue;
        violations.push(`${relative(ROOT, f)} → ${match[0]}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('Phase 13.5.3 — app.json claim consistency', () => {
  const appJson = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));

  it('extra.security.noExternalServers === true', () => {
    expect(appJson.expo.extra.security.noExternalServers).toBe(true);
  });

  it('extra.security carries the audit note pointing at this file', () => {
    expect(appJson.expo.extra.security.noExternalServersAuditNote).toEqual(
      expect.stringContaining('noExternalServersAudit'),
    );
  });

  it('extra.sentryDsn is empty (Phase 13.5.1 kill-switch defense in depth)', () => {
    expect(appJson.expo.extra.sentryDsn).toBe('');
  });
});
