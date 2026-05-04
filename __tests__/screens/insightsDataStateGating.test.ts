// ============================================================================
// Insights data-state gating — Phase 3.7.3 source-level guards.
//
// Mounting the Insights tab requires stubbing dozens of transitive imports
// (vitals storage, care-plan repo, providerPrepBuilder, navigation, ...).
// The unit-tested classifier (`__tests__/utils/insightsState.test.ts`) pins
// the spec table directly. THIS test pins the wiring at the call site:
// `app/(tabs)/understand.tsx` consumes `classifyInsightsState` and gates
// each section through `gatingForState`.
//
// The source-level contract:
//   1. Imports `classifyInsightsState` and `gatingForState`.
//   2. Reports section is wrapped in `gating.showReports`.
//   3. Adherence chart is wrapped in `gating.showAdherenceChart`.
//   4. Empty preview's tip card is gated via the new `showTipCard` prop.
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

  it('Reports section is gated by gating.showReports', () => {
    // The wrapper IIFE must mention `gating.showReports` near the
    // Reports section. We pin both: the section header marker AND the
    // gating reference within ~600 chars of it (the Reports IIFE).
    const reportsIdx = understandSrc.indexOf('═══ REPORTS ═══');
    expect(reportsIdx).toBeGreaterThan(0);
    const window = understandSrc.slice(reportsIdx, reportsIdx + 1000);
    expect(window).toMatch(/gating\.showReports\b/);
  });

  it('Medication adherence chart is gated by gating.showAdherenceChart', () => {
    const adherenceIdx = understandSrc.indexOf('═══ SECTION 5: MEDICATION ADHERENCE');
    expect(adherenceIdx).toBeGreaterThan(0);
    const window = understandSrc.slice(adherenceIdx, adherenceIdx + 800);
    expect(window).toMatch(/gating\.showAdherenceChart\b/);
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
    const helperSrc = readFileSync(join(ROOT, 'utils/insightsState.ts'), 'utf8');
    expect(helperSrc).toMatch(
      /adherenceFloor\s*=\s*daysOfData\s*>=\s*POPULATED_DAYS_THRESHOLD/,
    );
    expect(helperSrc).toMatch(/POPULATED_DAYS_THRESHOLD\s*=\s*14/);
  });
});
