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
    expect(render).toContain('EmberMate noticed');
  });

  test('correlationSeverity function exists', () => {
    expect(src).toContain('correlationSeverity');
  });

  test('suggestion text is shown for correlation cards', () => {
    expect(src).toMatch(/suggestion/);
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
// IG-6: Section labels use sectionLabel style
// ============================================================================
describe('IG-6: Section labels', () => {
  test('sectionLabel style exists', () => {
    expect(src).toContain('sectionLabel:');
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

  test('Sparkline component still exists', () => {
    expect(src).toMatch(/function Sparkline/);
  });

  test('generateActionableSuggestions function exists in utils', () => {
    expect(utilSrc).toContain('generateActionableSuggestions');
  });
});
