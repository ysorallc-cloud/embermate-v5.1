/**
 * Tests for Now Page contextual insight banner (INS-1 through INS-5).
 * InsightBanner between header and Today's Progress, data-driven insights only.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const nowSrc = readFileSync(join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8');
const nowRender = nowSrc.slice(nowSrc.indexOf('return ('));
const hookSrc = readFileSync(join(__dirname, '../../hooks/useNowInsights.ts'), 'utf8');
const insightSrc = readFileSync(join(__dirname, '../../utils/careInsights.ts'), 'utf8');

// ============================================================================
// INS-1: InsightBanner component
// ============================================================================
describe('INS-1: InsightBanner', () => {
  test('InsightBanner function or component exists in now.tsx', () => {
    expect(nowSrc).toMatch(/InsightBanner/);
  });

  test('banner has amber left border style', () => {
    expect(nowSrc).toMatch(/insightBanner/);
    const bannerStyle = nowSrc.match(/insightBanner:\s*\{[^}]+\}/);
    expect(bannerStyle).not.toBeNull();
    expect(bannerStyle![0]).toContain('borderLeftWidth');
    expect(bannerStyle![0]).toContain('borderLeftColor');
  });

  test('banner renders between header and Today\'s Progress', () => {
    // Find the JSX usage (not the function definition) by looking for <InsightBanner
    const headerIdx = nowRender.indexOf('ScreenHeader');
    const bannerIdx = nowRender.indexOf('<InsightBanner');
    const progressIdx = nowRender.indexOf("Today's Progress");
    expect(bannerIdx).toBeGreaterThan(headerIdx);
    expect(bannerIdx).toBeLessThan(progressIdx);
  });

  test('banner has dismiss button', () => {
    expect(nowSrc).toContain('insightDismissed');
    expect(nowSrc).toContain('setInsightDismissed');
  });

  test('banner only renders when insight exists and not dismissed', () => {
    expect(nowRender).toMatch(/insight\b.*&&.*!insightDismissed|!insightDismissed.*&&.*insight\b/);
  });
});

// ============================================================================
// INS-3: generateCareInsight with priority tiers
// ============================================================================
describe('INS-3: Priority-based generateCareInsight', () => {
  test('accepts recentHistory parameter', () => {
    expect(insightSrc).toMatch(/recentHistory/);
  });

  test('accepts appointments parameter', () => {
    expect(insightSrc).toMatch(/appointments|upcomingAppointments/);
  });

  test('P1: cross-category BP med + vitals insight exists', () => {
    expect(insightSrc).toMatch(/vitals.*before|Log vitals before/i);
    expect(insightSrc).toMatch(/lisinopril|amlodipine|metoprolol/i);
  });

  test('P1: meds + no meals insight exists', () => {
    expect(insightSrc).toMatch(/empty stomach|absorb.*food|medications.*food/i);
  });

  test('P2: appointment preparation insight exists', () => {
    expect(insightSrc).toMatch(/visit tomorrow|appointment.*tomorrow/i);
  });

  test('P3: multi-day lunch skip pattern exists', () => {
    expect(insightSrc).toMatch(/lunch.*skipped|skipped.*lunch/i);
  });

  test('P3: BP average insight exists', () => {
    expect(insightSrc).toMatch(/averaged|average.*blood pressure|average.*BP/i);
  });

  test('P3: med adherence streak insight exists', () => {
    expect(insightSrc).toMatch(/consecutive|days straight/i);
  });

  test('P4: evening meds reminder exists', () => {
    expect(insightSrc).toMatch(/evening med.*remaining/i);
  });

  test('removed: "Consistent timing helps" generic insight', () => {
    expect(insightSrc).not.toMatch(/'Consistent timing helps'/);
    expect(insightSrc).not.toMatch(/"Consistent timing helps"/);
  });

  test('removed: "Regular vitals logging" generic insight', () => {
    expect(insightSrc).not.toContain('Regular vitals logging helps detect dosage changes early');
  });

  test('removed: "Mood tracking helps" generic insight', () => {
    expect(insightSrc).not.toContain('Mood patterns can reveal how medications');
  });

  test('removed: "over halfway through" generic insight', () => {
    expect(insightSrc).not.toContain('over halfway through today\'s care tasks');
  });
});

// ============================================================================
// INS-4: careInsight removed from footer
// ============================================================================
describe('INS-4: Footer simplified', () => {
  test('footer does not reference careInsight', () => {
    const footerSection = nowRender.match(/footerSection[\s\S]*?<\/View>/);
    expect(footerSection).not.toBeNull();
    expect(footerSection![0]).not.toContain('careInsight');
  });

  test('footer shows static encouragement messages', () => {
    const footerSection = nowRender.match(/footerSection[\s\S]*?<\/View>/);
    expect(footerSection).not.toBeNull();
    expect(footerSection![0]).toContain('showed up today');
  });
});

// ============================================================================
// INS-5: Unified insight output
// ============================================================================
describe('INS-5: Unified insight', () => {
  test('useNowInsights returns single insight (not aiInsight/careInsight separately)', () => {
    expect(hookSrc).toMatch(/return\s*\{[^}]*insight[^}]*\}/);
    // Should not export aiInsight and careInsight as separate values
    expect(hookSrc).not.toMatch(/return\s*\{[^}]*aiInsight[^}]*careInsight[^}]*\}/);
  });

  test('now.tsx uses unified insight from hook', () => {
    expect(nowSrc).toMatch(/const\s*\{\s*insight\s*\}/);
  });
});

// ============================================================================
// INS-2: Multi-day history
// ============================================================================
describe('INS-2: Multi-day history in useNowInsights', () => {
  test('hook fetches recent history', () => {
    expect(hookSrc).toContain('recentHistory');
  });

  test('hook references listLogsInRange or similar multi-day fetch', () => {
    expect(hookSrc).toMatch(/listLogsInRange|getVitalsInRange|recentHistory/);
  });

  test('recentHistory is passed to generateCareInsight', () => {
    expect(hookSrc).toMatch(/generateCareInsight[\s\S]*recentHistory/);
  });
});
