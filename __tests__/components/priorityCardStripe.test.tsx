// ============================================================================
// Priority cards — no severity stripe (Phase 2.6.3).
//
// The prior v6.7 contract pinned a colored left-edge stripe per severity
// level (red for Required, mint for Recommended, gray for Optional).
// Phase 2.6.3 of the May 2 Care Plan flow foundation pass retires that
// stripe entirely:
//
//   • The Required stripe used `colors.error` (#e6776e), which doubles
//     as `criticalAlert` — a token reserved (Phase 7) for genuine
//     emergency cues like past-window not-logged items. Painting a
//     setup-screen category indicator with the same affordance was a
//     color-budget violation that miscued the eye.
//   • Three priority levels do not need three accent colors. Typography
//     weight + the selected-state ring carry the differentiation.
//
// Pins:
//   1. No `borderLeftWidth` / `borderLeftColor` on the priority option
//      style block — the stripe is gone.
//   2. No coral / criticalAlert / error / red color reference inside
//      the priority option JSX, in any form.
//   3. The selected priority still applies the mint border treatment
//      (`priorityOptionSelected: { ... borderColor: c.accent ... }`) —
//      that contract stays intact; selection signals through the ring.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const targets = [
  'app/care-plan/vitals.tsx',
  'app/care-plan/meals.tsx',
  'app/care-plan/sleep.tsx',
  'app/care-plan/activity.tsx',
  'app/care-plan/water.tsx',
];

// Pull just the JSX between `<View style={styles.priorityContainer}>` and
// its closing `</View>` for surgical assertions on the stripe rendering.
function extractPriorityBlock(src: string): string {
  const open = src.indexOf('priorityContainer}>');
  if (open < 0) return '';
  // Walk forward 2000 chars — comfortably covers the priority option map.
  return src.slice(open, open + 2000);
}

describe.each(targets)('Priority card — no stripe, no coral — %s', (rel) => {
  const src = read(rel);
  const priorityBlock = extractPriorityBlock(src);

  it('priority block exists in the source', () => {
    expect(priorityBlock.length).toBeGreaterThan(0);
  });

  it('does NOT carry a borderLeftWidth in the priority option JSX', () => {
    expect(priorityBlock).not.toMatch(/borderLeftWidth:/);
  });

  it('does NOT reference colors.error / c.error in the priority option JSX', () => {
    expect(priorityBlock).not.toMatch(/colors\.error|c\.error/);
  });

  it('does NOT reference colors.coral / criticalAlert / red anywhere in the block', () => {
    expect(priorityBlock).not.toMatch(/colors\.coral|c\.coral/);
    expect(priorityBlock).not.toMatch(/colors\.criticalAlert|c\.criticalAlert/);
    expect(priorityBlock).not.toMatch(/colors\.red|c\.red/);
    // Hex literals — the three coral-family values from the v7-reserved
    // palette comment + the legacy Tailwind red.
    expect(priorityBlock).not.toMatch(/#e6776e/i); // criticalAlert
    expect(priorityBlock).not.toMatch(/#e89a7a/i); // coral (v7-reserved)
    expect(priorityBlock).not.toMatch(/#f87171/i); // legacy Tailwind red-400
  });

  it('selected priority still applies the mint border treatment', () => {
    // Selection signal is unchanged — only the severity stripe is removed.
    expect(src).toMatch(/priorityOptionSelected:\s*\{[^}]*borderColor:\s*c\.accent/s);
  });
});
