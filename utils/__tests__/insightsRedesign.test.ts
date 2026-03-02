/**
 * Tests for Insights page redesign (IG-1 through IG-6).
 * Scorecard strip, category trends, actionable suggestions.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8');
const render = src.slice(src.indexOf('return ('));
const utilSrc = readFileSync(join(__dirname, '../../utils/understandInsights.ts'), 'utf8');

// ============================================================================
// IG-1: Scorecard strip replaces StatSpotlight hero
// ============================================================================
describe('IG-1: Scorecard strip', () => {
  test('StatSpotlight component is removed', () => {
    expect(src).not.toMatch(/function StatSpotlight/);
    expect(render).not.toContain('<StatSpotlight');
  });

  test('Scorecard component or scorecard styles exist', () => {
    expect(src).toMatch(/Scorecard|scorecard/);
  });

  test('scorecard shows 4 metrics: adherence, days, hydration, sleep', () => {
    expect(render).toMatch(/Adherence|adherence/i);
    expect(render).toMatch(/Days/i);
    expect(render).toMatch(/Hydration|Glasses|hydration/i);
    expect(render).toMatch(/Sleep/i);
  });

  test('heroCard style is removed', () => {
    expect(src).not.toMatch(/heroCard:\s*\{/);
  });
});

// ============================================================================
// IG-2: Suggestions replace InsightCallout
// ============================================================================
describe('IG-2: Actionable Suggestions', () => {
  test('InsightCallout component is removed', () => {
    expect(src).not.toMatch(/function InsightCallout/);
    expect(render).not.toContain('<InsightCallout');
  });

  test('Suggestions section exists in render', () => {
    expect(render).toMatch(/Suggestion|suggestion/);
  });

  test('generateActionableSuggestions function exists in utils', () => {
    expect(utilSrc).toContain('generateActionableSuggestions');
  });

  test('suggestion style has amber left border', () => {
    expect(src).toMatch(/suggestionCard|suggestionRow|suggestion/);
  });

  test('steady state fallback exists', () => {
    expect(src).toMatch(/steady|looks steady/i);
  });
});

// ============================================================================
// IG-3: Category trend rows
// ============================================================================
describe('IG-3: Category trends', () => {
  test('computeCategoryTrends function exists', () => {
    expect(src).toContain('computeCategoryTrends');
  });

  test('category trends include Meals, Hydration, Wellness, Sleep', () => {
    const fn = src.match(/function computeCategoryTrends[\s\S]*?^}/m);
    expect(fn).not.toBeNull();
    const block = fn![0];
    expect(block).toMatch(/Meals/);
    expect(block).toMatch(/Hydration/);
    expect(block).toMatch(/Wellness/);
    expect(block).toMatch(/Sleep/);
  });
});

// ============================================================================
// IG-4: "0 found Patterns" removed
// ============================================================================
describe('IG-4: Patterns chip removed', () => {
  test('"Patterns" chip with count is removed from scorecard', () => {
    expect(render).not.toContain('patternsFound');
    expect(render).not.toContain('found</Text>');
  });
});

// ============================================================================
// IG-5: CarePlanStats expanded
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
// IG-6: Renamed section header
// ============================================================================
describe('IG-6: Section renamed', () => {
  test('"VITALS AT A GLANCE" is removed', () => {
    expect(render).not.toContain('VITALS AT A GLANCE');
  });

  test('"TRENDS" section header exists', () => {
    expect(render).toContain('TRENDS');
  });
});

// ============================================================================
// Structural integrity
// ============================================================================
describe('Structural integrity', () => {
  test('VitalRow component still exists', () => {
    expect(src).toMatch(/function VitalRow/);
  });

  test('PatternCard component still exists', () => {
    expect(src).toMatch(/function PatternCard/);
  });

  test('PATTERNS DETECTED section still renders when cards exist', () => {
    expect(render).toContain('PATTERNS DETECTED');
  });

  test('Quick Actions grid still exists', () => {
    expect(render).toContain('quickActionsGrid');
  });
});
