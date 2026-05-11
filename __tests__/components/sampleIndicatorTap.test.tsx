// ============================================================================
// Sample data indicator on the Journal page — RETIRED in Phase 22.1.
//
// Phase 6 of the v6.7 Journal tone + behaviour pass introduced an
// inline sample-mode banner ("Example data — set up your loved one
// to get started") that tapped through to ManageSampleDataSheet.
//
// Phase 22.1 — the inline banner was retired from the Journal page as
// part of the handoff-document restructure. Sample data mixing
// workspace patterns with summary content was exactly the kind of
// clutter 22.1 set out to remove. ManageSampleDataSheet stays
// reachable via Settings → Manage sample data; there's no inline
// entry from Journal anymore.
//
// The contracts below pin the absence. The sheet wiring (import +
// state + render) stays in place so the Settings entry still works.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Phase 22.1 — sample data indicator retired from Journal', () => {
  it('the inline "Example data — set up your loved one" banner copy is gone', () => {
    expect(journalSrc).not.toContain('Example data — set up your loved one to get started');
  });

  it('the sampleIndicator style + chevron style are retired', () => {
    expect(journalSrc).not.toMatch(/\bsampleIndicator:\s*\{/);
    expect(journalSrc).not.toMatch(/\bsampleIndicatorChevron:/);
    expect(journalSrc).not.toMatch(/\bsampleIndicatorText:/);
  });

  it('the deprecated "Sample data — not real patient information" copy is also absent', () => {
    expect(journalSrc).not.toContain('Sample data — not real patient information');
  });
});

describe('Phase 22.1 — ManageSampleDataSheet wiring preserved (Settings entry still works)', () => {
  it('Journal still imports ManageSampleDataSheet', () => {
    expect(journalSrc).toMatch(/import\s+\{\s*ManageSampleDataSheet\s*\}/);
  });

  it('Journal still mounts <ManageSampleDataSheet /> for the Settings-driven entry', () => {
    expect(journalSrc).toMatch(/<ManageSampleDataSheet[\s\S]{0,300}?visible=\{manageSampleOpen\}/);
  });
});
