// ============================================================================
// Journal Share/Report — silent failure regression
// 1_BLOCKERS Fix 2: tapping Share/Report when brief is null used to silently
// return. The handlers now surface explicit Alerts for the loading + no-data
// states so the caregiver knows what's happening.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/(tabs)/journal.tsx'),
  'utf8',
);

describe('Journal share/report — explicit empty + loading states', () => {
  function getHandlerBody(name: string): string {
    const start = src.indexOf(`function ${name}()`);
    expect(start).toBeGreaterThan(-1);
    // Walk forward to the matching closing brace at the function's top level.
    const open = src.indexOf('{', start);
    let depth = 0;
    let i = open;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    return src.slice(open, i + 1);
  }

  describe('handleShareDaily', () => {
    const body = getHandlerBody('handleShareDaily');

    it('alerts when loading instead of silently returning', () => {
      expect(body).toMatch(/if\s*\(\s*loading\s*\)/);
      expect(body).toContain("Alert.alert('Loading'");
    });

    it('alerts when brief is null instead of silently returning', () => {
      expect(body).toMatch(/if\s*\(\s*!\s*brief\s*\)/);
      expect(body).toContain("Alert.alert(\n        'No Data'");
    });

    it('still calls buildDailySummaryReport on the happy path', () => {
      expect(body).toContain('buildDailySummaryReport(');
      expect(body).toContain('setDailyReport(result)');
      expect(body).toContain('setShowDailyPreview(true)');
    });

    it('does not contain the bare silent guard', () => {
      // Pre-fix shape: `if (!brief) return;`
      expect(body).not.toMatch(/if\s*\(\s*!\s*brief\s*\)\s*return\s*;/);
    });
  });

  describe('handleShareClinical', () => {
    const body = getHandlerBody('handleShareClinical');

    it('alerts when loading instead of silently returning', () => {
      expect(body).toMatch(/if\s*\(\s*loading\s*\)/);
      expect(body).toContain("Alert.alert('Loading'");
    });

    it('alerts when brief is null instead of silently returning', () => {
      expect(body).toMatch(/if\s*\(\s*!\s*brief\s*\)/);
      expect(body).toContain("Alert.alert(\n        'No Data'");
    });

    it('still calls buildClinicalReportData on the happy path', () => {
      expect(body).toContain('buildClinicalReportData(brief)');
      expect(body).toContain('setClinicalReport(result)');
      expect(body).toContain('setShowClinicalPreview(true)');
    });

    it('does not contain the bare silent guard', () => {
      expect(body).not.toMatch(/if\s*\(\s*!\s*brief\s*\)\s*return\s*;/);
    });
  });

  describe('header pill loading state', () => {
    it('Share pill dims to opacity 0.4 while loading', () => {
      // Both pills should be styled with [s.headerPill, loading && { opacity: 0.4 }]
      expect(src).toMatch(/headerPill,\s*loading\s*&&\s*\{\s*opacity:\s*0\.4\s*\}/);
      expect(src).toMatch(/headerPillReport,\s*loading\s*&&\s*\{\s*opacity:\s*0\.4\s*\}/);
    });

    it('header pills expose busy a11y state while loading', () => {
      expect(src).toContain('accessibilityState={{ busy: loading }}');
    });
  });
});
