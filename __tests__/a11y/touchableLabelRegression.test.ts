// ============================================================================
// A11y regression test — every Touchable must declare accessibilityLabel +
// accessibilityRole.
//
// Strategy: this is a *ratcheting* test. The codebase has a known set of
// pre-existing offenders (see BASELINE below). The test asserts that the
// per-file violation count never exceeds its baseline — so new touchables
// added without labels will fail CI, but existing ones don't block work.
//
// To shrink the baseline: fix the violations in a file, then update its entry
// here (or remove it entirely if it hits zero). The test will tell you what
// the new count is when it fails.
//
// Why ratchet instead of "fix everything first": there are 59 violations
// across 21 files. Forcing them all to be fixed in one PR is impractical;
// blocking new violations is the right ratchet to keep the count monotonic-
// decreasing.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '../..');

// Per-file violation count. The codebase is currently CLEAN — every Touchable
// declares both accessibilityLabel and accessibilityRole. The baseline is
// empty, which means the test enforces zero tolerance: any new violation
// fails CI.
//
// To intentionally add a known violation (rare — e.g. an experimental wrapper
// where roles are inherited from a parent), add the file here with the
// expected count and a justifying comment.
const BASELINE: Readonly<Record<string, number>> = Object.freeze({});

const TOUCHABLE_TYPES = [
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'Pressable',
];

interface Violation {
  file: string;
  line: number;
  component: string;
  hasLabel: boolean;
  hasRole: boolean;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.git', '.expo', 'dist', 'coverage', '__tests__'].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (full.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

/**
 * Find the index of the closing '>' of a JSX opening tag that starts at `from`.
 * Tracks brace depth so attribute expressions like `{{ foo: 'bar' }}` don't
 * end the tag prematurely. Tracks string literals so `>` in strings is ignored.
 */
function findOpeningTagEnd(src: string, from: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let j = from; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (c === inStr && src[j - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return j;
  }
  return -1;
}

function scan(): { violations: Violation[]; totalTouchables: number; filesScanned: number } {
  const files = ['app', 'components'].flatMap(r => walk(join(ROOT, r)));
  const violations: Violation[] = [];
  let totalTouchables = 0;

  const re = new RegExp(`<(${TOUCHABLE_TYPES.join('|')})(\\s|>)`, 'g');

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      const end = findOpeningTagEnd(src, m.index);
      if (end === -1) continue;
      totalTouchables++;
      const tag = src.slice(m.index, end + 1);
      const hasLabel = /accessibilityLabel\s*=/.test(tag);
      const hasRole = /accessibilityRole\s*=/.test(tag);
      if (!hasLabel || !hasRole) {
        violations.push({
          file: relative(ROOT, file),
          line: src.slice(0, m.index).split('\n').length,
          component: m[1],
          hasLabel,
          hasRole,
        });
      }
    }
  }

  return { violations, totalTouchables, filesScanned: files.length };
}

const { violations, totalTouchables, filesScanned } = scan();
const violationsByFile: Record<string, Violation[]> = {};
for (const v of violations) {
  (violationsByFile[v.file] ||= []).push(v);
}

describe('A11y regression — Touchables must have accessibilityLabel + accessibilityRole', () => {
  it('scans a meaningful number of files and Touchables (sanity check)', () => {
    // If either drops sharply, the scanner stopped working — investigate
    // before relaxing the assertions below.
    expect(filesScanned).toBeGreaterThan(100);
    expect(totalTouchables).toBeGreaterThan(100);
  });

  it('no NEW violations: per-file count never exceeds the BASELINE', () => {
    const overages: string[] = [];

    for (const file of Object.keys(violationsByFile)) {
      const current = violationsByFile[file].length;
      const allowed = BASELINE[file] ?? 0;
      if (current > allowed) {
        const sampleLines = violationsByFile[file]
          .slice(0, 5)
          .map(v => `      ${v.file}:${v.line} (${v.component})`)
          .join('\n');
        overages.push(
          `  ${file}: ${current} violations (baseline allows ${allowed})\n${sampleLines}`,
        );
      }
    }

    if (overages.length > 0) {
      const msg =
        '\nNew accessibility violations detected. Every Touchable must declare both ' +
        '`accessibilityLabel` and `accessibilityRole`. Fix the new touchable(s) below or ' +
        '— if you fixed existing ones — lower the BASELINE entry in this test file.\n\n' +
        overages.join('\n');
      throw new Error(msg);
    }
  });

  it('no orphaned BASELINE entries: every entry corresponds to an actually-violating file', () => {
    // If a file in BASELINE has zero violations, it should be removed so the
    // ratchet doesn't quietly let regressions back in.
    const stale: string[] = [];
    for (const file of Object.keys(BASELINE)) {
      const current = violationsByFile[file]?.length ?? 0;
      if (current === 0) stale.push(file);
    }
    if (stale.length > 0) {
      throw new Error(
        '\nStale BASELINE entries — these files are clean now, please remove them:\n' +
          stale.map(f => `  ${f}`).join('\n'),
      );
    }
  });

  it('total violation count is at or below the snapshot total (defense in depth)', () => {
    const baselineTotal = Object.values(BASELINE).reduce((a, b) => a + b, 0);
    expect(violations.length).toBeLessThanOrEqual(baselineTotal);
  });
});
