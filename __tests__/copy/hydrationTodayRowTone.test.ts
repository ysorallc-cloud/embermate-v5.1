// ============================================================================
// HydrationTodayRow — tone audit (Prompt 2 Phase 7).
//
// Locks in the v6.7 framing: the standalone hydration row says
// "Goal: N cups" or "—", never "Configure hydration target". Big-number
// label is plain "cup" / "cups", not "glasses" or any clinical phrasing.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const rowSrc = read('components/now/HydrationTodayRow.tsx');

// Strip /* */ block comments and // line comments before scanning user-
// visible copy. Doc comments in the source quote the banned strings (as
// the rule itself), which would otherwise trip the test.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('HydrationTodayRow — copy invariants', () => {
  it('eyebrow is "HYDRATION TODAY"', () => {
    expect(rowSrc).toContain('HYDRATION TODAY');
  });

  it('does NOT use "Configure hydration target" copy', () => {
    expect(stripComments(rowSrc)).not.toContain('Configure hydration target');
  });

  it('uses "Goal: N cups" framing for the goal line', () => {
    // Source-level pattern: backtick template `Goal: ${goal} cup${...}`
    expect(rowSrc).toMatch(/`Goal: \$\{goal\} cup/);
  });

  it('does NOT use "glasses" in the user-visible big-number label', () => {
    // "cup" / "cups" is the project-wide hydration unit. (Glasses appear in
    // legacy data shapes but the row's display copy stays on "cup(s)".)
    expect(rowSrc).toMatch(/cup\$\{cupsToday === 1 \? '' : 's'\}/);
  });
});
