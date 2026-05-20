// ============================================================================
// Insights data-state gating — Phase 3.7.3 source-level guards.
//
// Mounting the Insights tab requires stubbing dozens of transitive imports
// (vitals storage, care-plan repo, navigation, ...). The unit-tested
// classifier (`__tests__/utils/insightsState.test.ts`) pins the spec
// table directly. THIS test pins the wiring at the call site:
// `app/(tabs)/understand.tsx` consumes `classifyInsightsState` /
// `gatingForState` for the page-level disclaimer + empty-state gates.
//
// Phase 28 Batch B F6 (audit-revised cadence) reframed this file:
//   • The old "Reports section gated by gating.showReports" pinned the
//     `═══ REPORTS ═══` marker + the Share CTA gate. F6 retired the
//     standalone Share CTA + Reports section entirely.
//   • The old "Medication adherence chart gated by gating.showAdherenceChart"
//     pinned the `═══ SECTION 5: MEDICATION ADHERENCE` marker + the inline
//     adherence gate. F6 folded adherence into `<InsightsDataCard>`, which
//     handles its own data-state filtering internally.
//   • Adherence-chart hard floor pin moved to inspect `insightsState.ts`
//     helper directly (unchanged by F6).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const understandSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');
const previewSrc = readFileSync(
  join(ROOT, 'components/understand/InsightsEmptyStatePreview.tsx'),
  'utf8',
);

describe('Phase 3.7.3 — Insights data-state gating wired into understand.tsx', () => {
  it('imports the state classifier and gating helper', () => {
    expect(understandSrc).toMatch(
      /import\s*\{[^}]*classifyInsightsState[^}]*\}\s*from\s*['"][^'"]*insightsState['"]/,
    );
    expect(understandSrc).toMatch(
      /import\s*\{[^}]*gatingForState[^}]*\}\s*from\s*['"][^'"]*insightsState['"]/,
    );
  });

  it('passes showTipCard through to InsightsEmptyStatePreview', () => {
    expect(understandSrc).toMatch(
      /<InsightsEmptyStatePreview[\s\S]*?showTipCard=\{gating\.showTipCard\}/,
    );
  });

  it('InsightsEmptyStatePreview accepts a showTipCard prop and gates the tip card render', () => {
    // Prop is declared.
    expect(previewSrc).toMatch(/\bshowTipCard\??:\s*boolean/);
    // The tip card render is wrapped in `{showTipCard && ...}`.
    expect(previewSrc).toMatch(/\{showTipCard\s*&&/);
  });

  it('the adherence-chart conditional includes the daysOfData hard floor', () => {
    // gatingForState enforces daysOfData >= POPULATED_DAYS_THRESHOLD before
    // showAdherenceChart can be true. Pin it at the helper's source so a
    // future classifier weakening doesn't silently lower the floor.
    // Post-F6: the consumer of `showAdherenceChart` moved into
    // InsightsDataCard's internal gating logic, but the helper-level
    // hard-floor pin still guards the threshold definition.
    const helperSrc = readFileSync(join(ROOT, 'utils/insightsState.ts'), 'utf8');
    expect(helperSrc).toMatch(
      /adherenceFloor\s*=\s*daysOfData\s*>=\s*POPULATED_DAYS_THRESHOLD/,
    );
    expect(helperSrc).toMatch(/POPULATED_DAYS_THRESHOLD\s*=\s*14/);
  });
});
