// ============================================================================
// Phase 28a — Insights gating mutual exclusion (empty-state preview vs
// partial-populated surfaces).
//
// Pre-28a bug: `app/(tabs)/understand.tsx:672` rendered the
// InsightsEmptyStatePreview ("Patterns Coming · X of 14 days") whenever
// the classifier returned 'building' state (1-13 days, ≥1 event).
// Two other surfaces — the pulse summary (line 688) and the data-gaps
// section (line 720) — had independent `daysOfData >= 7` gates that
// bypassed the classifier. The 7-13 days window therefore rendered
// BOTH groups simultaneously: empty-state "Patterns Coming" stacked
// on top of the populated pulse summary + data gaps. Sample data
// seeded 13 days, landing exactly in this overlap window, which
// surfaced the bug visually.
//
// Phase 28a fix (Option A, minimal): add `daysOfData <
// EMPTY_STATE_DAYS_THRESHOLD` to the line-672 guard, where the new
// constant equals 7. The empty-state preview hides at day 7+ when
// the populated surfaces start rendering. Three mutually-exclusive
// render groups:
//
//   • daysOfData < 7      → empty-state preview only
//   • 7 ≤ daysOfData < 14 → pulse + data-gaps only (building with content)
//   • daysOfData ≥ 14     → full populated (reports + adherence too)
//
// Pinned contracts:
//   1. EMPTY_STATE_DAYS_THRESHOLD is exported from insightsState and
//      equals 7.
//   2. Boundary at days=6 — empty-state preview gate passes; pulse +
//      data-gaps gates fail.
//   3. Boundary at days=7 — empty-state preview gate fails; pulse +
//      data-gaps gates pass.
//   4. Boundary at days=13 — empty-state preview gate fails (preserved
//      from contract 3); reports + adherence gates still fail (not
//      yet populated state).
//   5. Boundary at days=14 — all populated-state gates pass.
//   6. Source-level pin: understand.tsx line-672 guard includes the
//      < threshold check (literal 7 or named constant).
//   7. Source-level pin: pulse + data-gaps guards still use >= 7 (or
//      the named constant) — same threshold as the empty-state gate's
//      ceiling, ensuring the cliff is at exactly the same day boundary.
//   8. Mutual exclusion: across daysOfData 0..20, the empty-state
//      preview gate and the pulse/data-gaps gates never BOTH pass.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

import {
  classifyInsightsState,
  gatingForState,
  POPULATED_DAYS_THRESHOLD,
  EMPTY_STATE_DAYS_THRESHOLD,
} from '../../utils/insightsState';

const SRC_PATH = join(__dirname, '../../app/(tabs)/understand.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

// ----------------------------------------------------------------------------
// Render-decision predicates that mirror understand.tsx's actual gate
// expressions. If a production guard drifts, the source-level pins in
// contracts 6+7 catch it. The predicates here let the boundary
// contracts assert behavior without mounting the screen.
// ----------------------------------------------------------------------------

function emptyStatePreviewGate(daysOfData: number, events: number, isSampleData: boolean): boolean {
  // understand.tsx:672 post-28a:
  //   pageData && !pageData.isSampleData && pageData.daysOfData < EMPTY_STATE_DAYS_THRESHOLD && gating.showPatternsComing
  if (isSampleData) return false;
  if (daysOfData >= EMPTY_STATE_DAYS_THRESHOLD) return false;
  const state = classifyInsightsState(daysOfData, events);
  const gating = gatingForState(state, daysOfData);
  return gating.showPatternsComing;
}

function pulseSummaryGate(daysOfData: number): boolean {
  // understand.tsx:688:
  //   pageData && pageData.daysOfData >= 7
  return daysOfData >= EMPTY_STATE_DAYS_THRESHOLD;
}

function dataGapsGate(daysOfData: number): boolean {
  // understand.tsx:720:
  //   pageData && pageData.daysOfData >= 7 && dataGaps.length > 0
  // dataGaps.length is content-dependent; the guard's day-bound
  // threshold is what mutual exclusion turns on.
  return daysOfData >= EMPTY_STATE_DAYS_THRESHOLD;
}

function reportsGate(daysOfData: number, events: number): boolean {
  // gating.showReports is true only for populated state.
  const state = classifyInsightsState(daysOfData, events);
  return gatingForState(state, daysOfData).showReports;
}

function adherenceChartGate(daysOfData: number, events: number): boolean {
  const state = classifyInsightsState(daysOfData, events);
  return gatingForState(state, daysOfData).showAdherenceChart;
}

// ----------------------------------------------------------------------------
// Contracts
// ----------------------------------------------------------------------------

describe('Phase 28a — EMPTY_STATE_DAYS_THRESHOLD constant', () => {
  it('contract 1: EMPTY_STATE_DAYS_THRESHOLD is exported from insightsState and equals 7', () => {
    expect(EMPTY_STATE_DAYS_THRESHOLD).toBe(7);
    // And the other named threshold stays at 14 (regression-pin for
    // any future refactor that might collapse the two).
    expect(POPULATED_DAYS_THRESHOLD).toBe(14);
  });
});

describe('Phase 28a — boundary contracts (the 6→7 transition where the bug lived)', () => {
  it('contract 2: daysOfData=6 — empty-state preview renders; pulse + data-gaps absent', () => {
    const days = 6;
    const events = 1; // any positive count puts the classifier into 'building'
    expect(emptyStatePreviewGate(days, events, false)).toBe(true);
    expect(pulseSummaryGate(days)).toBe(false);
    expect(dataGapsGate(days)).toBe(false);
  });

  it('contract 3: daysOfData=7 — empty-state preview absent; pulse + data-gaps render', () => {
    const days = 7;
    const events = 1;
    expect(emptyStatePreviewGate(days, events, false)).toBe(false);
    expect(pulseSummaryGate(days)).toBe(true);
    expect(dataGapsGate(days)).toBe(true);
  });

  it('contract 4: daysOfData=13 — still building (no reports / adherence yet) but partial-populated surfaces show', () => {
    const days = 13;
    const events = 1;
    expect(emptyStatePreviewGate(days, events, false)).toBe(false);
    expect(pulseSummaryGate(days)).toBe(true);
    expect(dataGapsGate(days)).toBe(true);
    expect(reportsGate(days, events)).toBe(false);
    expect(adherenceChartGate(days, events)).toBe(false);
  });

  it('contract 5: daysOfData=14 — full populated; all populated-state gates pass', () => {
    const days = 14;
    const events = 1;
    expect(emptyStatePreviewGate(days, events, false)).toBe(false);
    expect(pulseSummaryGate(days)).toBe(true);
    expect(dataGapsGate(days)).toBe(true);
    expect(reportsGate(days, events)).toBe(true);
    expect(adherenceChartGate(days, events)).toBe(true);
  });
});

describe('Phase 28a — source-level guard pins', () => {
  it('contract 6: understand.tsx line-672 guard gates the empty-state preview on daysOfData < threshold', () => {
    // Accept either the named constant or the literal 7 — the named
    // form is preferred but the literal is acceptable per D3
    // (extraction is optional polish).
    expect(SRC).toMatch(
      /pageData[^}]*!pageData\.isSampleData[^}]*pageData\.daysOfData\s*<\s*(?:EMPTY_STATE_DAYS_THRESHOLD|7)\b/,
    );
  });

  it('contract 7: page-level mutual-exclusion gate (< threshold) remains intact post-F6', () => {
    // Phase 28 Batch B F6 reframed this contract. Pre-F6: the inline
    // "This week's pulse" + "Missing data" sections each carried a
    // `daysOfData >= 7` guard at the page level, making the boundary
    // double-pinned in understand.tsx. F6 folded both surfaces into
    // InsightsReadCard + InsightsDataCard, which now carry the
    // populated-data filtering internally. The page-level guard that
    // remains is the empty-state preview's `< 7` (mutual exclusion
    // CLIFF). That guard is what contract 6 pins. As long as the
    // empty-state preview gate uses the canonical threshold, the
    // mutual exclusion contract holds — the cards' internal gating
    // is contracted in their own component test files.
    const emptyStateGuards = SRC.match(
      /pageData\.daysOfData\s*<\s*(?:EMPTY_STATE_DAYS_THRESHOLD|7)\b/g,
    ) ?? [];
    expect(emptyStateGuards.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 28a — mutual exclusion sweep (0..20 days)', () => {
  it('contract 8: at no daysOfData value do both empty-state preview AND pulse render simultaneously', () => {
    for (let days = 0; days <= 20; days += 1) {
      // events=1 is the worst-case (puts classifier in building/populated).
      // events=0 sends the classifier to 'empty' which behaves the same as
      // 'building' for the showPatternsComing flag — still mutually exclusive.
      for (const events of [0, 1]) {
        const previewActive = emptyStatePreviewGate(days, events, false);
        const pulseActive = pulseSummaryGate(days);
        const dataGapsActive = dataGapsGate(days);
        // The cliff: never both.
        expect(previewActive && pulseActive).toBe(false);
        expect(previewActive && dataGapsActive).toBe(false);
      }
    }
  });
});
