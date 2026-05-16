/**
 * Tests for Understand page redesign:
 * Care Score ring, Correlations, Data Gaps, Vitals Dashboard, Medication Adherence.
 * StatSpotlight, InsightCallout, heroCard removed.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8');
const render = src.slice(src.indexOf('return ('));
const utilSrc = readFileSync(join(__dirname, '../../utils/understandInsights.ts'), 'utf8');
// Phase 15.9 — the "EmberMate noticed" pattern stack moved out of
// understand.tsx into components/insights/PatternStack.tsx. The
// severity logic, suggestion render, and section markup now live
// there. Audits below read both sources so they keep guarding the
// surface wherever it lives.
const patternStackSrc = readFileSync(join(__dirname, '../../components/insights/PatternStack.tsx'), 'utf8');
const understandPlusPatternStack = src + '\n' + patternStackSrc;

// ============================================================================
// IG-1: CareScoreRing replaces StatSpotlight hero
// ============================================================================
describe('IG-1: Care Score ring', () => {
  test('StatSpotlight component is removed', () => {
    expect(src).not.toMatch(/function StatSpotlight/);
    expect(render).not.toContain('<StatSpotlight');
  });

  test('CareScoreRing component exists', () => {
    expect(src).toMatch(/function CareScoreRing/);
  });

  test('heroCard style is removed', () => {
    expect(src).not.toMatch(/heroCard:\s*\{/);
  });
});

// ============================================================================
// IG-2: Correlation cards with severity
// ============================================================================
describe('IG-2: Correlations section', () => {
  test('InsightCallout component is removed', () => {
    expect(src).not.toMatch(/function InsightCallout/);
    expect(render).not.toContain('<InsightCallout');
  });

  test('Correlations Found section exists', () => {
    // Phase 15.9 — the "EmberMate noticed" eyebrow moved into
    // PatternStack along with the rest of the section.
    expect(understandPlusPatternStack).toContain('EmberMate noticed');
  });

  test('correlation severity logic exists (in understand.tsx OR PatternStack.tsx)', () => {
    // Phase 15.9 — function was renamed to `patternSeverity` when
    // it moved into PatternStack. Check either name in either file.
    expect(understandPlusPatternStack).toMatch(/correlationSeverity|patternSeverity/);
  });

  test('suggestion text is shown for correlation cards', () => {
    // Phase 15.9 — the suggestion render moved to PatternStack.
    expect(understandPlusPatternStack).toMatch(/suggestion/);
  });
});

// ============================================================================
// IG-3: Data Gaps section
// ============================================================================
describe('IG-3: Data Gaps', () => {
  test('computeDataGaps function exists', () => {
    expect(src).toContain('computeDataGaps');
  });

  test('Data Gaps section renders', () => {
    expect(render).toContain('Missing data');
  });
});

// ============================================================================
// IG-5: CarePlanStats expanded in utils
// ============================================================================
describe('IG-5: CarePlanStats expanded', () => {
  test('CarePlanStats has avgMealsPerDay', () => {
    expect(utilSrc).toContain('avgMealsPerDay');
  });

  test('CarePlanStats has avgHydrationPerDay', () => {
    expect(utilSrc).toContain('avgHydrationPerDay');
  });

  test('CarePlanStats has avgSleepHours', () => {
    expect(utilSrc).toContain('avgSleepHours');
  });

  test('CarePlanStats has avgWellnessPerDay', () => {
    expect(utilSrc).toContain('avgWellnessPerDay');
  });

  test('CarePlanStats has lunchSkipRate', () => {
    expect(utilSrc).toContain('lunchSkipRate');
  });
});

// ============================================================================
// IG-6: Section labels — Phase 15.12 swept onto SectionEyebrow
//
// The local sectionLabel style was retired when all four uses moved
// onto the shared SectionEyebrow primitive (components/SectionEyebrow.tsx)
// for uniform eyebrow typography across Insights surfaces.
// ============================================================================
describe('IG-6: Section labels', () => {
  test('SectionEyebrow primitive drives the page-level section labels', () => {
    expect(src).toMatch(/import\s+\{[^}]*\bSectionEyebrow\b[^}]*\}/);
    expect(src).toMatch(/<SectionEyebrow\b/);
  });

  test('Vitals section exists', () => {
    expect(render).toContain('Vitals');
  });

  test('Medication Adherence section exists', () => {
    expect(render).toContain('Medication adherence');
  });
});

// ============================================================================
// Structural integrity
// ============================================================================
describe('Structural integrity', () => {
  test('CareScoreRing component still exists', () => {
    expect(src).toMatch(/function CareScoreRing/);
  });

  test('Sparkline component is available to understand.tsx (Phase 28 F4 relocation)', () => {
    // Pre-Phase-28 Sparkline lived as `function Sparkline` inside
    // app/(tabs)/understand.tsx. Phase 28 F4 relocated it to
    // components/insights/Sparkline.tsx so InsightsDataCard could
    // consume it without duplication. understand.tsx now imports it
    // — the contract this test enforces is "Sparkline is reachable
    // from understand.tsx", not "Sparkline is defined inline there".
    expect(src).toMatch(/import\s*\{[^}]*\bSparkline\b[^}]*\}\s*from\s*['"][^'"]*components\/insights\/Sparkline['"]/);
  });

  test('generateActionableSuggestions function exists in utils', () => {
    expect(utilSrc).toContain('generateActionableSuggestions');
  });
});
