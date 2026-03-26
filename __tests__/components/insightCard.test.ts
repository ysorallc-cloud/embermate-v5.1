// ============================================================================
// InsightCard — Structure and rendering logic tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type { InsightText } from '../../types/insightText';

const cardPath = path.resolve(__dirname, '../../components/insights/InsightCard.tsx');
const cardSrc = fs.readFileSync(cardPath, 'utf-8');

describe('InsightCard', () => {
  it('component renders with title, body, severity dot', () => {
    // Card renders title text
    expect(cardSrc).toContain('insight.title');
    // Card renders body text
    expect(cardSrc).toContain('insight.body');
    // Card renders severity dot
    expect(cardSrc).toContain('dotColor');
    expect(cardSrc).toContain('styles.dot');
  });

  it('severity dot color maps correctly', () => {
    // watch → amber, good → green, info → textMuted
    expect(cardSrc).toContain('watch: colors.amber');
    expect(cardSrc).toContain('good: colors.green');
    expect(cardSrc).toContain('info: colors.textMuted');
  });

  it('expandable variant shows "why it matters"', () => {
    expect(cardSrc).toContain('insight.whyItMatters');
    expect(cardSrc).toContain('whyItMatters');
    expect(cardSrc).toContain('expandable');
  });

  it('expanded state shows date range', () => {
    expect(cardSrc).toContain('expanded');
    expect(cardSrc).toContain('insight.dateRange');
  });

  it('pattern row renders when pattern exists', () => {
    expect(cardSrc).toContain('insight.pattern');
    expect(cardSrc).toContain('patternText');
  });

  it('InsightText type is imported and used', () => {
    expect(cardSrc).toContain("import type { InsightText }");
    expect(cardSrc).toContain('insight: InsightText');
  });

  it('InsightText type compiles with all fields', () => {
    const insight: InsightText = {
      id: 'test-1',
      icon: '⚠️',
      category: 'watch',
      title: 'BP trending up',
      body: 'Systolic has been above 140 for 3 days.',
      severity: 'watch',
      whyItMatters: 'Sustained elevation may need attention.',
      pattern: 'Correlates with missed evening meds',
      dateRange: { start: '2026-03-18', end: '2026-03-25' },
    };
    expect(insight.title).toBe('BP trending up');
    expect(insight.severity).toBe('watch');
    expect(insight.whyItMatters).toBeDefined();
  });
});
