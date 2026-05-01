// ============================================================================
// Regression guard — banned color literals from prior palettes must not
// appear in production files. Sweeps app/, components/, services/, utils/,
// hooks/, lib/, contexts/, storage/. theme-tokens.ts is excluded (the
// canonical token source can reference any value), as are tests.
// ============================================================================

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const REPO_ROOT = join(__dirname, '../..');
const SCAN_DIRS = [
  'app',
  'components',
  'services',
  'utils',
  'hooks',
  'lib',
  'contexts',
  'storage',
];

// Cool blue-black + electric-mint + saturated-lavender / amber / red literals
// that predate the v6.7 Sage warm-dark palette. Any production file holding
// one of these is overriding the theme.
const BANNED_LITERALS = [
  '#0a0e14',
  '#1c2330',
  '#181f2c',
  '#222b3a',
  '#34d399',
  '#b794f4',
  '#fbbf24',
  '#f87171',
];

const SKIP_PATTERNS = [
  /\bnode_modules\b/,
  /\.test\.tsx?$/,
  /__tests__/,
  /__mocks__/,
  /\.snap$/,
  // Token source itself can reference any palette value.
  new RegExp(`theme${sep === '\\' ? '\\\\' : sep}theme-tokens\\.ts$`),
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (p: string) => {
    let entries;
    try { entries = readdirSync(p); } catch { return; }
    for (const entry of entries) {
      const full = join(p, entry);
      let s;
      try { s = statSync(full); } catch { continue; }
      const rel = relative(REPO_ROOT, full);
      if (SKIP_PATTERNS.some((p) => p.test(rel))) continue;
      if (s.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

function stripComments(src: string): string {
  // Banned literals appearing in /* */ or // comments are historical context,
  // not rendered values — strip before scanning so we only flag live code.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

interface Hit {
  file: string;
  line: number;
  literal: string;
  text: string;
}

function scan(): Hit[] {
  const hits: Hit[] = [];
  const files = SCAN_DIRS.flatMap((d) => listSourceFiles(join(REPO_ROOT, d)));
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const stripped = stripComments(raw);
    // Map line numbers from the stripped version back to the original.
    // Simpler: scan stripped, then re-find the literal in the original to
    // surface the line. Hits in /* */ blocks are skipped because the literal
    // is gone from the stripped src.
    const strippedLines = stripped.split('\n');
    strippedLines.forEach((line, i) => {
      const lower = line.toLowerCase();
      for (const literal of BANNED_LITERALS) {
        if (lower.includes(literal.toLowerCase())) {
          hits.push({
            file: relative(REPO_ROOT, file),
            line: i + 1,
            literal,
            text: line.trim(),
          });
        }
      }
    });
  }
  return hits;
}

describe('Deprecated color-palette literals — regression guard', () => {
  it('finds zero banned literals in production code', () => {
    const hits = scan();
    if (hits.length > 0) {
      const report = hits
        .map((h) => `  ${h.file}:${h.line} — ${h.literal}\n    ${h.text}`)
        .join('\n');
      throw new Error(
        `Found ${hits.length} banned color literal(s). Replace with a Sage-palette token reference:\n${report}`,
      );
    }
    expect(hits.length).toBe(0);
  });
});
