// ============================================================================
// noHardcodedWhiteText33 — Phase 33 brand-alignment text-color contract.
//
// Defends against re-introduction of hardcoded white text in production
// source (app/ + components/). Q-F9.3 Option B whitelist preserved for
// 4 lines where pure white is intentional perceptual work:
//
//   • app/_layout.tsx:427 lockButtonText (Q-33.9 — lockscreen; shifted
//     401→427 by the F2 Poppins imports + Text.defaultProps block)
//   • components/support/BreathingExercise.tsx:374 countdown (BE modal,
//     dim-lit breathing scene)
//   • components/support/BreathingExercise.tsx:380 phaseLabel (BE modal)
//   • components/support/BreathingExercise.tsx:409 endLinkText (BE modal,
//     alpha 0.5)
//
// Phase 33b extension lavender no-fill canon shifted the BE line numbers
// (was 364/370/397 → 374/380/409) when added JSX-inline lane-canon
// comments + expanded beginButtonText's commentary. The whitelist
// tracks the moving target.
//
// All other text-color literals must route through the cream/secondary/
// tertiary/muted token ladder, or use #0a0c0a near-black on sage/lavender/
// coral colored surfaces per Phase 26 F4 precedent.
//
// Scope: `color:` text-color references only. `backgroundColor:` /
// `borderColor:` and other property contexts are out of F9/F11 scope.
// Theme/ excluded — token declarations themselves can carry pure-white
// values (e.g., textHighContrast: '#FFFFFF' is a legitimate semantic
// token for absolute-max-contrast surfaces).
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

const ROOT = join(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.') || name === '__tests__') continue;
      walk(full, out);
    } else {
      const ext = extname(name);
      if (['.ts', '.tsx'].includes(ext) && !name.endsWith('.d.ts') && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
        out.push(full);
      }
    }
  }
  return out;
}

const APP_FILES = walk(join(ROOT, 'app'));
const COMP_FILES = walk(join(ROOT, 'components'));
const SOURCE_FILES = [...APP_FILES, ...COMP_FILES];

// ── Q-F9.3 Option B whitelist (file path relative to ROOT, line number) ──
//
// Each entry is a (relativePath, lineNumber) pair pinning an intentional
// white-text site. Any future migration of these sites should update the
// whitelist atomically with the source change — leaving the whitelist
// out of date is the smell this test catches.

const WHITELIST: Array<{ path: string; line: number; rationale: string }> = [
  {
    path: 'app/_layout.tsx',
    line: 426,
    rationale: 'lockscreen — Q-33.9 (pure white on lockscreen UI is intentional)',
  },
  {
    path: 'components/support/BreathingExercise.tsx',
    line: 374,
    rationale: 'BE modal countdown (36pt) — Option B dim-lit breathing scene',
  },
  {
    path: 'components/support/BreathingExercise.tsx',
    line: 380,
    rationale: 'BE modal phaseLabel (22pt) — Option B dim-lit breathing scene',
  },
  {
    path: 'components/support/BreathingExercise.tsx',
    line: 409,
    rationale: 'BE modal endLinkText (rgba 0.5) — Option B dim-lit breathing scene',
  },
];

function isWhitelisted(relPath: string, lineNumber: number): boolean {
  return WHITELIST.some((w) => w.path === relPath && w.line === lineNumber);
}

// Strip line + block comments so commit-narrative comments mentioning
// '#fff' don't false-positive.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Hardcoded white in any of these forms:
//   color: '#fff' / '#FFF' / '#ffffff' / '#FFFFFF'
//   color: 'white' (case-insensitive)
//   color: 'rgba(255, 255, 255, X)' (whitespace flexible)
const WHITE_TEXT_PATTERN =
  /color:\s*['"](?:#(?:[fF]{3}|[fF]{6})|white|rgba\(\s*255\s*,\s*255\s*,\s*255[^)]*\))['"]/;

function scanFile(absPath: string): Array<{ line: number; text: string }> {
  const src = readFileSync(absPath, 'utf8');
  const stripped = stripComments(src);
  // Walk line by line so line numbers match the unstripped source layout.
  // Stripping preserves newlines, so lineIndex stays in sync.
  const lines = stripped.split('\n');
  const hits: Array<{ line: number; text: string }> = [];
  lines.forEach((line, idx) => {
    if (WHITE_TEXT_PATTERN.test(line)) {
      hits.push({ line: idx + 1, text: line.trim() });
    }
  });
  return hits;
}

describe('noHardcodedWhiteText33 — Phase 33 brand-alignment contract', () => {
  it('no `color: white-literal` outside the Q-F9.3 whitelist', () => {
    const offenders: string[] = [];
    for (const absPath of SOURCE_FILES) {
      const rel = relative(ROOT, absPath);
      for (const hit of scanFile(absPath)) {
        if (!isWhitelisted(rel, hit.line)) {
          offenders.push(`${rel}:${hit.line}\n    ${hit.text}`);
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Phase 33 F9/F11 — hardcoded white text outside the whitelist (${offenders.length} site${offenders.length === 1 ? '' : 's'}):\n  ${offenders.join('\n  ')}\n\n` +
        `Migrate to one of:\n` +
        `  • c.textPrimary / c.textBright / c.textSecondary / c.textTertiary / c.textMuted (per text-tier semantic)\n` +
        `  • #0a0c0a (near-black) for sage/lavender/coral colored-surface text (Phase 26 F4 precedent)\n` +
        `If the new site is legitimately pure-white perceptual work (e.g., a new dim-lit modal scene), add it to the WHITELIST in this file with a one-line rationale.`,
      );
    }
    expect(offenders).toEqual([]);
  });

  it('every whitelist entry points to an actual white-text literal in production source', () => {
    // Catches whitelist staleness — if a whitelisted line was migrated
    // but the whitelist entry wasn't removed, the entry becomes a dead
    // pin. This test fails loudly so the whitelist stays honest.
    const stale: string[] = [];
    for (const entry of WHITELIST) {
      const abs = join(ROOT, entry.path);
      try {
        const lines = readFileSync(abs, 'utf8').split('\n');
        const line = lines[entry.line - 1] ?? '';
        if (!WHITE_TEXT_PATTERN.test(line)) {
          stale.push(`${entry.path}:${entry.line} — whitelisted as "${entry.rationale}" but line no longer matches the white-text pattern.\n    line content: ${line.trim()}`);
        }
      } catch (err) {
        stale.push(`${entry.path}:${entry.line} — file missing or unreadable.`);
      }
    }
    if (stale.length > 0) {
      throw new Error(
        `Phase 33 F11 — stale whitelist entries (${stale.length}):\n  ${stale.join('\n  ')}\n\n` +
        `If the line was migrated away from white text, remove the whitelist entry.\n` +
        `If the line moved (e.g., source edit shifted line numbers), update the line number in the WHITELIST.`,
      );
    }
    expect(stale).toEqual([]);
  });
});
