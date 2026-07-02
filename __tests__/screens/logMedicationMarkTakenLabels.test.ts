// ============================================================================
// Log Medication — Mark-Taken control labels (Jul 2 brief item 4, final spec).
//
// The screen has a TOP selector (local setMode, no commit) and a BOTTOM footer
// button (the actual submit). Pre-fix both spoke near-identical "Mark" language
// ("✓ Mark Taken" selector vs "✓ Mark as Taken" submit), reading as duplicates.
//
// Final spec:
//   • Top selector  → past-tense STATE labels, no checkmark, no "Mark":
//       "Taken" / "Skipped"  (a11y labels match, so VoiceOver drops "Mark" too)
//   • Bottom confirm → UNCHANGED commit: "✓ Mark as Taken"
//   • Bottom skip    → UNCHANGED (already clean): "Skip This Dose"
//
// Source-pin the EXACT strings (not a smoke test) so a future edit can't drift
// the selector back into "Mark"/commit language or silently retitle the submit.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/log-medication-plan-item.tsx'),
  'utf8',
);

describe('item 4 — top selector uses past-tense state labels (no "Mark", no ✓)', () => {
  it('confirm selector reads exactly "Taken" (raw JSX text node)', () => {
    expect(src).toMatch(/>\s*Taken\s*</);
  });

  it('skip selector reads exactly "Skipped" (raw JSX text node)', () => {
    expect(src).toMatch(/>\s*Skipped\s*</);
  });

  it('the old "✓ Mark Taken" selector label is gone', () => {
    expect(src).not.toMatch(/✓ Mark Taken/);
  });

  it('the old bare "Skip" selector text node is gone (now "Skipped")', () => {
    // >Skip< would be the old selector; >Skipped< does NOT match this.
    expect(src).not.toMatch(/>\s*Skip\s*</);
  });

  it('selector a11y labels match the visible state labels (no residual "Mark")', () => {
    expect(src).toMatch(/accessibilityLabel="Taken"/);
    expect(src).toMatch(/accessibilityLabel="Skipped"/);
    expect(src).not.toMatch(/accessibilityLabel="Mark Taken"/);
  });
});

describe('item 4 — bottom footer commit labels UNCHANGED', () => {
  it('confirm-mode submit stays "✓ Mark as Taken"', () => {
    expect(src).toMatch(/['"]✓ Mark as Taken['"]/);
  });

  it('skip-mode submit stays "Skip This Dose" (already clean — not retitled)', () => {
    expect(src).toMatch(/['"]Skip This Dose['"]/);
  });
});
