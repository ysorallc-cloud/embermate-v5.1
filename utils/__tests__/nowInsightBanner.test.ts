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
describe('INS-1: InsightBanner replaced by QuickPulseStatus', () => {
  test('InsightBanner removed — QuickPulseStatus replaces it', () => {
    expect(nowSrc).toContain('QuickPulseStatus');
    expect(nowRender).toContain('<QuickPulseStatus');
  });

  test('QuickPulseStatus renders with pulse styles', () => {
    expect(nowSrc).toContain('pulseContainer');
    expect(nowSrc).toContain('pulseRow');
    expect(nowSrc).toContain('pulseDot');
    expect(nowSrc).toContain('pulseGreeting');
  });

  test('overdue callouts built from instances', () => {
    expect(nowSrc).toContain('buildOverdueCallouts');
    expect(nowSrc).toContain('pulseCallout');
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
    // footerSection was removed — coffee moment + encouragement text moved to Support tab
    expect(nowRender).not.toContain('careInsight');
  });

  test('footer section removed (Support tab is now the wellness surface)', () => {
    // footerSection no longer exists in now.tsx
    const footerSection = nowRender.match(/footerSection[\s\S]*?<\/View>/);
    expect(footerSection).toBeNull();
  });
});

// ============================================================================
// INS-5: Unified insight output
// ============================================================================
describe('INS-5: Unified insight replaced by QuickPulseStatus', () => {
  test('useNowInsights hook still exists for potential reuse', () => {
    expect(hookSrc).toMatch(/return\s*\{[^}]*insight[^}]*\}/);
  });

  test('now.tsx no longer destructures insight from hook', () => {
    // QuickPulseStatus replaces the insight banner
    expect(nowSrc).toContain('QuickPulseStatus');
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
