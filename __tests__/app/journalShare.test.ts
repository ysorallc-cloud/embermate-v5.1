// ============================================================================
// Journal Share/Report — Phase 9 differentiation contract.
//
// Earlier coverage (this file pre-redesign) asserted the old "Daily Summary
// preview modal" flow with explicit Loading + No Data alerts. The handoff
// recompose deletes that flow: Share opens HandoffSheet inline, Report
// navigates to /visit-prep. The narrower assertions below replace the
// loading/no-data alert checks; the new wiring is covered comprehensively
// in __tests__/integration/journalShareVsReport.test.tsx.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');

describe('Journal report pill — page header carries Report only (v6.7 Phase 9)', () => {
  it('Report pill dims to opacity 0.4 while loading', () => {
    expect(src).toMatch(/headerPillReport,\s*loading\s*&&\s*\{\s*opacity:\s*0\.4\s*\}/);
  });

  it('Report pill exposes busy a11y state while loading', () => {
    expect(src).toContain('accessibilityState={{ busy: loading }}');
  });

  it('Share pill is no longer in the page header', () => {
    expect(src).not.toMatch(/<Text style=\{s\.headerPillText\}>Share<\/Text>/);
  });
});

describe('Journal share/report — handlers route to the new surfaces (Phase 9)', () => {
  it('handleShareDaily opens the HandoffSheet (no preview modal)', () => {
    const start = src.indexOf('function handleShareDaily');
    const end = src.indexOf('function handleShareClinical');
    const body = src.slice(start, end);
    expect(body).toMatch(/setHandoffSheetVisible\(\s*true\s*\)/);
    expect(body).not.toContain('setShowDailyPreview');
    expect(body).not.toContain('buildDailySummaryReport');
  });

  it('handleShareClinical navigates to /visit-prep (no preview modal)', () => {
    const start = src.indexOf('function handleShareClinical');
    const tail = src.slice(start);
    const body = tail.slice(0, tail.indexOf('}') + 1);
    expect(body).toMatch(/navigate\s*\(\s*['"]\/visit-prep['"]\s*\)/);
    expect(body).not.toContain('setShowClinicalPreview');
    expect(body).not.toContain('buildClinicalReportData');
  });
});
