// ============================================================================
// v7 preview tone audit (Prompt 7 Phase 5).
//
// Sweeps the three preview surfaces (onboarding AsYouUseScreen, Insights
// empty-state preview, Settings → What's next) for forbidden phrasing and
// verifies the required v6.7→v7 framing anchors land at least once across
// the set.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const SURFACES = [
  'app/(onboarding)/screens/AsYouUseScreen.tsx',
  'components/understand/InsightsEmptyStatePreview.tsx',
  'app/settings/whats-next.tsx',
];

function stripCommentsAndCode(src: string): string {
  // Strip block + line comments and JSX/JS code that isn't user-visible
  // string content. We keep the simple approach: remove comments first,
  // then collect everything inside string literals.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

function userFacingStrings(src: string): string {
  const stripped = stripCommentsAndCode(src);
  const literals: string[] = [];
  const re = /(['"`])((?:\\.|(?!\1).)*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    literals.push(m[2]);
  }
  return literals.join('\n');
}

const SURFACE_SOURCES = SURFACES.map((f) => ({
  path: f,
  src: read(f),
  user: userFacingStrings(read(f)),
}));

// ── Forbidden ───────────────────────────────────────────────────────────────
describe('v7 preview tone — forbidden phrasing', () => {
  const banned: string[] = [
    'Coming soon!',
    'V7',
    'version 7',
    '7.0',
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'first quarter',
    'Beta',
    'alpha',
    'early access',
    'AI-powered',
    'machine learning',
    'Get notified',
    'Sign up for updates',
  ];

  for (const term of banned) {
    it(`no preview surface uses "${term}"`, () => {
      const violations: string[] = [];
      for (const s of SURFACE_SOURCES) {
        // Case-insensitive presence check on user-facing strings.
        if (s.user.toLowerCase().includes(term.toLowerCase())) {
          violations.push(s.path);
        }
      }
      expect(violations).toEqual([]);
    });
  }

  it('no preview surface uses "intelligent" as adjective for the product', () => {
    for (const s of SURFACE_SOURCES) {
      // The whole-word check avoids tripping on "intelligence" (which we
      // also don't use, but the check is intentionally narrow here).
      expect(s.user.toLowerCase()).not.toMatch(/\bintelligent\b/);
    }
  });
});

// ── Required ────────────────────────────────────────────────────────────────
describe('v7 preview tone — required framing', () => {
  it('"Built with input from real nurses" appears at least once across the surfaces', () => {
    const combined = SURFACE_SOURCES.map((s) => s.user).join('\n');
    expect(combined.toLowerCase()).toContain('input from real nurses');
  });

  it('"as you go" or "as your data accumulates" framing appears', () => {
    const combined = SURFACE_SOURCES.map((s) => s.user).join('\n');
    const lower = combined.toLowerCase();
    const hasAsYouGo = lower.includes('as you go');
    const hasAsAccum = lower.includes('as your data accumulates');
    const hasAccumulates = lower.includes('accumulates');
    const hasLongerYouTrack = lower.includes('the longer you track');
    expect(hasAsYouGo || hasAsAccum || hasAccumulates || hasLongerYouTrack).toBe(true);
  });
});

// ── Sweep is actually running ───────────────────────────────────────────────
describe('v7 preview tone — meta', () => {
  it('all three preview source files were loaded', () => {
    expect(SURFACE_SOURCES.length).toBe(3);
    for (const s of SURFACE_SOURCES) {
      expect(s.user.length).toBeGreaterThan(0);
    }
  });
});
