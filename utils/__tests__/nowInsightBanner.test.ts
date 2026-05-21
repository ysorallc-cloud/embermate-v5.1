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
describe('INS-1: InsightBanner removed (StatRings mount hidden post-Item-A)', () => {
  // Original contract: pre-INS-1 a contextual InsightBanner sat between
  // header and Today's Progress; INS-1 retired it and replaced with
  // StatRings. Phase 33b extension pre-Lock-3 Item A then hid the
  // StatRings mount too (7-into-6 cap conflict; hide-don't-delete with
  // restore path preserved). Both InsightBanner and StatRings render
  // calls are absent from now.tsx. The StatRings import is preserved
  // for the post-launch restore path.

  test('InsightBanner is NOT rendered on Now', () => {
    expect(nowRender).not.toMatch(/<InsightBanner\b/);
  });

  test('StatRings render call is NOT in now.tsx (Item A hide-don\'t-delete)', () => {
    expect(nowRender).not.toMatch(/<StatRings\b/);
  });

  test('StatRings import is preserved for the post-launch restore path', () => {
    expect(nowSrc).toContain("import { StatRings }");
  });

  test('overdue callouts built from instances', () => {
    expect(nowSrc).toContain('buildOverdueCallouts');
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
describe('INS-5: Unified insight removed (post Item-A)', () => {
  test('useNowInsights hook still exists for potential reuse', () => {
    expect(hookSrc).toMatch(/return\s*\{[^}]*insight[^}]*\}/);
  });

  test('now.tsx retains the StatRings import (post-launch restore path) but does NOT render <StatRings>', () => {
    // Both signals: import preserved for restore, mount absent post-Item-A.
    expect(nowSrc).toContain("import { StatRings }");
    expect(nowSrc).not.toMatch(/<StatRings\b/);
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
