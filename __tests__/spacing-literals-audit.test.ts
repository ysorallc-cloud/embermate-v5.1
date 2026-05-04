// ============================================================================
// Spacing literals audit — Phase 3.7.1 (commit 2 / regression guard).
//
// Permanent guard against re-introducing inline numeric literals for
// margin/padding values that the canonical 4pt scale (Spacing tokens)
// already covers. The cascade commit migrated ~150 literals; this test
// fails if any new ones land without a deliberate `// allow:` escape.
//
// Scope: app/(tabs)/ and components/ only. Sub-page work in app/log-*
// (Phase 9) and app/care-plan/* (Phase 8 territory) is explicitly out of
// scope until those phases run.
//
// Violation set: any margin/padding numeric literal in
//   {14, 16, 18, 22, 24, 26, 28}
// that does NOT have a `// allow: <reason>` comment on the same line.
//
// 14, 18, 22, 26 are off-scale; 16/24/28 are token-equivalents that
// should reference Spacing.md / Spacing.lg / Spacing.lg respectively.
// 12 (Spacing.sm) and 8 (Spacing.xs) are excluded — they're frequently
// used as cardPadding (12) or rowGap (8) and don't benefit from token
// indirection at every site.
//
// Standard escape: `// allow: tap-target padding (Apple HIG ≥44pt)` for
// button / row tap-target shapes. Other `// allow: <reason>` patterns
// also pass — the test only requires that any allow comment exists on
// the same line (or the immediately preceding line for multi-prop rows).
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

const SCOPE_DIRS = [
  'app/(tabs)',
  'components',
];

const VIOLATION_VALUES = new Set([14, 16, 18, 22, 24, 26, 28]);
const PROPS_REGEX = /\b(marginTop|marginBottom|marginVertical|marginLeft|marginRight|marginHorizontal|paddingTop|paddingBottom|paddingVertical|paddingLeft|paddingRight|paddingHorizontal):\s*(\d+)(?!\d)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      if (full.includes('/__tests__/')) continue;
      walk(full, out);
    } else {
      if ((name.endsWith('.tsx') || name.endsWith('.ts')) && !name.endsWith('.d.ts')) {
        out.push(full);
      }
    }
  }
  return out;
}

interface Violation {
  file: string;
  line: number;
  prop: string;
  value: number;
  context: string;
}

function audit(): Violation[] {
  const violations: Violation[] = [];
  for (const dir of SCOPE_DIRS) {
    const full = join(ROOT, dir);
    for (const file of walk(full)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        // Skip pure-comment lines (migration narrative, not active style).
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        // Skip lines that already carry an allow comment.
        if (/\/\/\s*allow:/i.test(line)) continue;
        // Match a violation prop:value on this line.
        const m = line.match(PROPS_REGEX);
        if (!m) continue;
        const value = Number(m[2]);
        if (!VIOLATION_VALUES.has(value)) continue;
        violations.push({
          file: file.replace(ROOT, ''),
          line: i + 1,
          prop: m[1],
          value,
          context: line.trim(),
        });
      }
    }
  }
  return violations;
}

describe('Phase 3.7.1 — spacing literals audit guard', () => {
  it('audit scope discovers a meaningful number of style files', () => {
    let count = 0;
    for (const dir of SCOPE_DIRS) {
      count += walk(join(ROOT, dir)).length;
    }
    // If this drops to a tiny number, the walk broke — surface loudly.
    expect(count).toBeGreaterThan(50);
  });

  it('no margin/padding numeric literals from {14,16,18,22,24,26,28} without // allow:', () => {
    const violations = audit();
    if (violations.length > 0) {
      const lines = violations.slice(0, 20).map(
        (v) => `  ${v.file}:${v.line}  ${v.prop}: ${v.value}  →  ${v.context}`,
      );
      const more = violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '';
      throw new Error(
        `${violations.length} hardcoded spacing literal(s) found. Each one must:\n` +
          `  • route through a Spacing token (Spacing.md, Spacing.lg, etc.), OR\n` +
          `  • carry a // allow: <reason> comment on the same line.\n\n` +
          `Sample violations:\n${lines.join('\n')}${more}`,
      );
    }
    expect(violations.length).toBe(0);
  });
});
